import base64
from io import BytesIO
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

os.environ.setdefault('DATABASE_URL', 'sqlite://')
os.environ.setdefault('SECRET_KEY', 'test-only-secret-at-least-32-characters')

from alembic import command
from alembic.config import Config
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.core.database import Base, get_db
from app.core.security import create_access_token, create_refresh_token, hash_password
from app.core.rate_limit import _buckets
from app.models.models import *


class BackendRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        @event.listens_for(cls.engine, 'connect')
        def foreign_keys(connection, record):
            connection.execute('PRAGMA foreign_keys=ON')
        cls.sessions = sessionmaker(bind=cls.engine, autoflush=False)

    def setUp(self):
        _buckets.clear()
        Base.metadata.create_all(self.engine)
        def db_override():
            with self.sessions() as db:
                try:
                    yield db
                except Exception:
                    db.rollback()
                    raise
        app.dependency_overrides[get_db] = db_override
        self.client = TestClient(app)
        with self.sessions() as db:
            buyer = Utilizador(nome_completo='Comprador', nome_utilizador='buyer', email='buyer@example.com', numero_telefone='244923456789', senha_hash=hash_password('password123'))
            seller = Utilizador(nome_completo='Vendedor', nome_utilizador='seller', email='seller@example.com', numero_telefone='244923456788', senha_hash=hash_password('password123'), tipo_utilizador=TipoUtilizadorEnum.vendedor)
            db.add_all([buyer, seller]); db.flush()
            profile = PerfilVendedor(utilizador_id=seller.id, nome_loja='Loja', tipo_loja=TipoLojaEnum.ambos)
            db.add(profile); db.flush()
            db.add_all([Produto(vendedor_id=profile.id, nome='Produto', preco='12.50', stock=5), Servico(vendedor_id=profile.id, nome='Serviço', preco_base='100.00')])
            db.commit()
            self.buyer, self.seller = buyer.id, seller.id
        self.headers = {'Authorization': 'Bearer ' + create_access_token({'sub':str(self.buyer)})}
        self.seller_headers = {'Authorization': 'Bearer ' + create_access_token({'sub':str(self.seller)})}

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(self.engine)

    def test_health_openapi_and_seed_removed(self):
        self.assertEqual(self.client.get('/health').json(), {'status':'ok'})
        self.assertEqual(self.client.get('/openapi.json').status_code, 200)
        self.assertEqual(self.client.get('/seed-db').status_code, 404)

    def test_login_and_token_separation(self):
        r = self.client.post('/api/v1/auth/login', json={'identificador':'buyer@example.com','senha':'password123'})
        self.assertEqual(r.status_code, 200, r.text)
        tokens = r.json()
        for token, expected in [(tokens['access_token'],200), (tokens['refresh_token'],401), (create_access_token({}),401), (create_access_token({'sub':'abc'}),401)]:
            self.assertEqual(self.client.get('/api/v1/auth/me',headers={'Authorization':'Bearer '+token}).status_code,expected)

    def test_checkout_totals_stock_and_status(self):
        r=self.client.post('/api/v1/pedidos/produtos',headers=self.headers,json={'itens':[{'produto_id':1,'quantidade':2}]})
        self.assertEqual(r.status_code,201,r.text)
        with self.sessions() as db:
            order=db.get(Pedido,r.json()['pedido_id'])
            self.assertEqual(str(order.valor_subtotal),'25.00')
            self.assertEqual(order.valor_total,order.pagamento.valor)
            self.assertEqual(db.get(Produto,1).stock,3)
        url=f"/api/v1/pedidos/produtos/{r.json()['pedido_id']}/status"
        self.assertEqual(self.client.put(url,headers=self.headers,json={'status':'confirmado'}).status_code,403)
        r=self.client.put(url,headers=self.seller_headers,json={'status':'confirmado'})
        self.assertEqual(r.status_code,200,r.text)

    def test_negative_quantity_and_atomic_failed_checkout(self):
        for quantity in [0,-1]:
            self.assertEqual(self.client.post('/api/v1/pedidos/produtos',headers=self.headers,json={'itens':[{'produto_id':1,'quantidade':quantity}]}).status_code,422)
        r=self.client.post('/api/v1/pedidos/produtos',headers=self.headers,json={'itens':[{'produto_id':1,'quantidade':1},{'produto_id':999,'quantidade':1}]})
        self.assertEqual(r.status_code,404,r.text)
        with self.sessions() as db:
            self.assertEqual(db.get(Produto,1).stock,5)
            self.assertEqual(db.query(Pedido).count(),0)

    def test_services_and_real_estate(self):
        r=self.client.post('/api/v1/pedidos/servicos',headers=self.headers,json={'servico_id':1})
        self.assertEqual(r.status_code,201,r.text)
        r=self.client.post('/api/v1/imoveis/',headers=self.seller_headers,json={'titulo':'Casa','preco':500000,'finalidade':'venda','tipo_imovel':'moradia'})
        self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(self.client.get('/api/v1/imoveis/').status_code,200)

    def test_cors(self):
        headers={'Origin':'http://localhost:5500','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'Authorization,Content-Type'}
        self.assertEqual(self.client.options('/api/v1/auth/login',headers=headers).status_code,200)
        headers['Origin']='https://untrusted.example'
        self.assertEqual(self.client.options('/api/v1/auth/login',headers=headers).status_code,400)

    def test_rate_limit(self):
        for _ in range(10):
            self.assertEqual(self.client.post('/api/v1/auth/login',json={'identificador':'missing','senha':'bad'}).status_code,401)
        self.assertEqual(self.client.post('/api/v1/auth/login',json={'identificador':'missing','senha':'bad'}).status_code,429)

    def test_image_validation(self):
        from app.core.images import save_image
        from fastapi import HTTPException
        for data in ['!!!', base64.b64encode(b'<svg onload="alert(1)"/>').decode(), 'data:image/../../evil;base64,AAAA']:
            with self.assertRaises(HTTPException):
                save_image(data,'produtos/1','capa')
        with tempfile.TemporaryDirectory() as folder:
            image=BytesIO();Image.new('RGB',(4,4),'red').save(image,'PNG')
            with patch('app.core.images.BASE_DIR',Path(folder)):
                url=save_image(base64.b64encode(image.getvalue()).decode(),'produtos/1','capa')
                self.assertTrue(url.endswith('.jpg'))
                self.assertEqual(len(list(Path(folder).rglob('*.jpg'))),1)

    def test_review_requires_purchase(self):
        r=self.client.post('/api/v1/avaliacoes/',headers=self.headers,json={'vendedor_id':1,'produto_id':1,'nota':5})
        self.assertEqual(r.status_code,403,r.text)


class MigrationRegression(unittest.TestCase):
    def test_migration_chain_and_metadata(self):
        # SQLite validates the historical table DDL. PostgreSQL enums need the integration test below.
        cfg=Config(str(Path(__file__).resolve().parents[1]/'alembic.ini'))
        with tempfile.TemporaryDirectory() as tmp:
            url='sqlite:///'+str(Path(tmp)/'migration.db')
            with patch('app.core.config.settings.DATABASE_URL',url):
                command.upgrade(cfg,'head')
            engine=create_engine(url)
            try:
                with engine.connect() as connection:
                    def compare_types(ctx, inspected, model, inspected_type, model_type):
                        if isinstance(model_type, __import__('sqlalchemy').Enum):
                            return False  # SQLite stores enum labels as VARCHAR.
                        return None
                    diffs=compare_metadata(MigrationContext.configure(connection, opts={'compare_type':compare_types}),Base.metadata)
                    self.assertEqual(diffs,[])
            finally:
                engine.dispose()


if __name__ == '__main__':
    unittest.main()
