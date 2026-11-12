# -*- coding: utf-8 -*-
"""
Celtics Smart Parking System — Database Engine
Підключення до SQLite / PostgreSQL через SQLAlchemy
"""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

for p in (PROJECT_ROOT, BACKEND_DIR, APP_DIR):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

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
    try:
        from backend.app import models  # noqa: F401
    except ImportError:
        try:
            from app import models  # noqa: F401
        except ImportError:
            import models  # noqa: F401
    Base.metadata.create_all(bind=engine)


def drop_db():
    """Очищення всіх таблиць бази даних"""
    try:
        from backend.app import models  # noqa: F401
    except ImportError:
        try:
            from app import models  # noqa: F401
        except ImportError:
            import models  # noqa: F401
    Base.metadata.drop_all(bind=engine)
