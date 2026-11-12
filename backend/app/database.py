# -*- coding: utf-8 -*-
"""
Celtics Smart Parking System — Database Engine
Підключення до SQLite / PostgreSQL через SQLAlchemy
"""

import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Автоматичне визначення шляху до бази даних parking.db у корені проєкту
BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
PROJECT_ROOT = BASE_DIR.parent                   # Celtics-Smart-Parking/
DEFAULT_DB_FILE = PROJECT_ROOT / "parking.db"

# Підтримка змінної оточення DATABASE_URL (зручно для PostgreSQL або локального SQLite)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_FILE.as_posix()}")

# Для SQLite обов'язково передаємо check_same_thread: False
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Генератор сесії бази даних для FastAPI Depends або використання у сервісах"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Створення всіх таблиць у базі даних згідно з ORM-моделями"""
    import backend.app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)


def drop_db():
    """Очищення всіх таблиць бази даних"""
    import backend.app.models  # noqa: F401
    Base.metadata.drop_all(bind=engine)
