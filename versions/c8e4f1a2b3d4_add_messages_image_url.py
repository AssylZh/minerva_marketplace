"""add image_url to messages

Revision ID: c8e4f1a2b3d4
Revises: a114181ffc69
Create Date: 2026-04-17

"""
from alembic import op
import sqlalchemy as sa


revision = "c8e4f1a2b3d4"
down_revision = "b3f2e1d4c5a6"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "messages",
        sa.Column("image_url", sa.String(length=500), nullable=True),
    )


def downgrade():
    op.drop_column("messages", "image_url")
