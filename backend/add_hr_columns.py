import os

from dotenv import load_dotenv
from sqlalchemy import inspect, text
from sqlalchemy import create_engine


# ============================================================
# LOAD DATABASE URL
# ============================================================

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Example: DATABASE_URL=postgresql+psycopg://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME"
    )

if DATABASE_URL.startswith("sqlite"):
    raise RuntimeError(
        "This migration helper is for PostgreSQL. Do not use SQLite for production migration."
    )

# ============================================================
# REQUIRED COLUMNS
# ============================================================

required_columns = {
    "hr_role": "TEXT",
    "hr_grade": "TEXT",
    "location": "TEXT",
    "reporting_manager": "TEXT",
    "experience": "TEXT",
}


# ============================================================
# MIGRATE
# ============================================================

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    future=True,
)

with engine.begin() as conn:
    inspector = inspect(conn)
    existing_columns = {
        column["name"]
        for column in inspector.get_columns("employees")
    }

    for column_name, column_type in required_columns.items():
        if column_name in existing_columns:
            print(f"✓ Already exists: {column_name}")
            continue

        print(f"+ Adding: {column_name}")
        conn.execute(
            text(
                f"ALTER TABLE employees ADD COLUMN {column_name} {column_type}"
            )
        )

    print("\nMigration completed successfully.")