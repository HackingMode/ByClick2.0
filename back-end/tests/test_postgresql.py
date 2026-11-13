"""Opt-in PostgreSQL test using a temporary schema; no public data touched."""
import os
import unittest
import uuid
from pathlib import Path
from alembic import command
from alembic.config import Config
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, text
os.environ.setdefault('DATABASE_URL', 'sqlite://')
os.environ.setdefault('SECRET_KEY', 'test-only-secret-at-least-32-characters')
from app.core.database import Base
from app.models import models


@unittest.skipUnless(os.getenv('TEST_DATABASE_URL'), 'TEST_DATABASE_URL not configured')
class PostgreSQLMigrationTest(unittest.TestCase):
    def test_upgrade_downgrade_reupgrade_and_chat_preservation(self):
        engine=create_engine(os.environ['TEST_DATABASE_URL'])
        schema='byclick_test_'+uuid.uuid4().hex
        cfg=Config(str(Path(__file__).resolve().parents[1]/'alembic.ini'))
        try:
            with engine.connect() as connection:
                connection.execute(text(f'CREATE SCHEMA {schema}'))
                connection.execute(text(f'SET search_path TO {schema}'))
                connection.commit()
                cfg.attributes['connection']=connection
                command.upgrade(cfg,'3a474861868f')
                connection.commit()
                connection.execute(text('CREATE TABLE mensagens_chat (id integer primary key, conteudo text)'))
                connection.execute(text("INSERT INTO mensagens_chat VALUES (1, 'preservar')"))
                connection.commit()
                command.upgrade(cfg,'head')
                connection.commit()
                self.assertEqual(connection.execute(text('SELECT conteudo FROM mensagens_chat')).scalar(),'preservar')
                diffs=compare_metadata(MigrationContext.configure(connection,opts={'include_object':lambda obj,name,kind,reflected,compare_to: name != 'mensagens_chat'}),Base.metadata)
                self.assertEqual(diffs,[])
                labels=connection.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid=enumtypid JOIN pg_namespace n ON n.oid=typnamespace WHERE typname='tipolojaenum' AND n.nspname=:schema ORDER BY enumsortorder"),{'schema':schema}).scalars().all()
                self.assertIn('imobiliaria',labels)
                connection.commit()
                command.downgrade(cfg,'3a474861868f')
                connection.commit()
                command.upgrade(cfg,'head')
                connection.commit()
                self.assertEqual(connection.execute(text('SELECT count(*) FROM mensagens_chat')).scalar(),1)
                connection.commit()
                command.downgrade(cfg,'base')
                connection.commit()
                command.upgrade(cfg,'head')
                connection.commit()
        finally:
            with engine.begin() as connection:
                connection.execute(text(f'DROP SCHEMA IF EXISTS {schema} CASCADE'))
            engine.dispose()
