"""Align shop types with the real estate models without removing existing data.

Revision ID: f41c90a62e07
Revises: def0664d357e
"""
from alembic import op

revision = "f41c90a62e07"
down_revision = "def0664d357e"
branch_labels = None
depends_on = None


def upgrade():
    if op.get_bind().dialect.name == 'postgresql':
        op.execute("ALTER TYPE tipolojaenum ADD VALUE IF NOT EXISTS 'imobiliaria' BEFORE 'ambos'")


def downgrade():
    # PostgreSQL cannot remove an enum value. Refuse if a shop still uses it.
    op.execute("""DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM perfis_vendedor WHERE tipo_loja::text = 'imobiliaria') THEN
            RAISE EXCEPTION 'Convert imobiliaria shops before downgrading';
        END IF;
    END $$""")
    op.execute("ALTER TYPE tipolojaenum RENAME TO tipolojaenum_old")
    op.execute("CREATE TYPE tipolojaenum AS ENUM ('produtos', 'servicos', 'ambos')")
    op.execute("ALTER TABLE perfis_vendedor ALTER COLUMN tipo_loja TYPE tipolojaenum USING tipo_loja::text::tipolojaenum")
    op.execute("DROP TYPE tipolojaenum_old")
