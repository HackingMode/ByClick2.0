"""Add address coordinates used by seller listings and registration.

Revision ID: 71b26f9c804d
Revises: f41c90a62e07
"""
from alembic import op, context
import sqlalchemy as sa

revision = '71b26f9c804d'
down_revision = 'f41c90a62e07'
branch_labels = None
depends_on = None


def upgrade():
    columns = set() if context.is_offline_mode() else {
        c['name'] for c in sa.inspect(op.get_bind()).get_columns('enderecos')
    }
    for name in ('latitude', 'longitude'):
        if name not in columns:
            op.add_column('enderecos', sa.Column(name, sa.Float(), nullable=True))


def downgrade():
    op.drop_column('enderecos', 'longitude')
    op.drop_column('enderecos', 'latitude')
