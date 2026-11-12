# -*- coding: utf-8 -*-
"""
Celtics Smart Parking System — Central REST API
Головний файл сервера (FastAPI, Swagger UI на /docs, CORS)
"""

import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Гарантуємо коректний sys.path незалежно від способу запуску:
# python backend/app/main.py, uvicorn backend.app.main:app або запуск з будь-якої директорії
APP_DIR = Path(__file__).resolve().parent          # backend/app
BACKEND_DIR = APP_DIR.parent                      # backend
PROJECT_ROOT = BACKEND_DIR.parent                 # Celtics-Smart-Parking

for p in (PROJECT_ROOT, BACKEND_DIR, APP_DIR):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from backend.app.database import init_db
except ImportError:
    try:
        from app.database import init_db
    except ImportError:
        from database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Життєвий цикл додатку: ініціалізація БД при старті"""
    init_db()
    yield


app = FastAPI(
    title="Celtics Smart Parking System API",
    description="Центральне REST API смарт-системи паркінгу ТЦ (Celtics)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Налаштування CORS для підключення 2D-карти та B2B-дашборду
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health"])
def root():
    return {
        "project": "Celtics Smart Parking System",
        "status": "online",
        "version": "1.0.0",
        "swagger_docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    # Запуск сервера на порту 8000
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
