"""add purchased_from and purchased_year to items

Revision ID: b3f2e1d4c5a6
Revises: a114181ffc69
Create Date: 2026-04-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'b3f2e1d4c5a6'
down_revision = 'a114181ffc69'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('items', sa.Column('purchased_from', sa.String(length=255), nullable=True))
    op.add_column('items', sa.Column('purchased_year', sa.String(length=10), nullable=True))


def downgrade():
    op.drop_column('items', 'purchased_year')
    op.drop_column('items', 'purchased_from')
