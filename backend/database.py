"""
Database configuration and session management.
"""
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# SQLite database URL
SQLALCHEMY_DATABASE_URL = "sqlite:///./testimonials.db"

# Create engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

# Create session local class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


def get_db():
    """
    Dependency function to get database session.
    Yields a database session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database - create all tables.
    Called on application startup.
    """
    Base.metadata.create_all(bind=engine)

    # Lightweight schema migration for existing SQLite databases
    # Adds new nullable columns if they do not exist.
    with engine.connect() as connection:
        column_rows = connection.execute(text("PRAGMA table_info(campaigns)")).fetchall()
        existing_columns = {row[1] for row in column_rows}

        if "edited_highlights" not in existing_columns:
            connection.execute(text("ALTER TABLE campaigns ADD COLUMN edited_highlights TEXT"))

        if "logo_path" not in existing_columns:
            connection.execute(text("ALTER TABLE campaigns ADD COLUMN logo_path TEXT"))

        if "bgm_path" not in existing_columns:
            connection.execute(text("ALTER TABLE campaigns ADD COLUMN bgm_path TEXT"))

        connection.commit()
