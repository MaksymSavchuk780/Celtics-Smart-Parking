# -*- coding: utf-8 -*-
"""
Celtics Smart Parking System — Central REST API
Головний файл сервера (FastAPI, Swagger UI на /docs, CORS)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from backend.app.database import init_db
except ImportError:
    from app.database import init_db

app = FastAPI(
    title="Celtics Smart Parking System API",
    description="Центральне REST API смарт-системи паркінгу ТЦ (Celtics)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Налаштування CORS для підключення 2D-карти та B2B-дашборду
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    """Ініціалізація бази даних при старті сервера"""
    init_db()


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
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
