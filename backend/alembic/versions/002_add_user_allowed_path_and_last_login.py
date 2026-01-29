"""Add allowed_path_prefix and last_login_at to users (existing DB).

Revision ID: 002
Revises: 001
Create Date: 2025-01-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns if they don't exist (PostgreSQL 9.5+)
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_path_prefix VARCHAR"
    )
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS last_login_at")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS allowed_path_prefix")
