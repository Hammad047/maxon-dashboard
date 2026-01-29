# Database migrations (Alembic)

## Setup PostgreSQL

- **Docker**: `docker-compose up -d postgres` (from project root).
- **Local**: Ensure PostgreSQL is running and create database `dashboard` and user `admin`/password `admin` if needed.

## Run migrations

From the **backend** directory:

```bash
# Install deps
pip install -r requirements.txt

# Set SYNC_DATABASE_URL in .env (use localhost when running from host)
# SYNC_DATABASE_URL=postgresql://admin:admin@localhost:5432/dashboard

# Apply all migrations
alembic upgrade head

# Create a new revision
alembic revision -m "description"
```

## Revisions

- **001**: Creates tables `users`, `sessions`, `audit_logs`, `file_metadata` (with `allowed_path_prefix`, `last_login_at` on users).
- **002**: Adds `allowed_path_prefix` and `last_login_at` to `users` if missing (for existing DBs).
