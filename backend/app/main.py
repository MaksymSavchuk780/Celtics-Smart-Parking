# -*- coding: utf-8 -*-
"""
Celtics Smart Parking System — Central REST API
FastAPI Application Entrypoint with Swagger Documentation
Author: Савчук (Backend / Database Engineer)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import map as map_router
from .routers import reservations as res_router
from .routers import telemetry as telemetry_router

# Автоматичне створення таблиць у SQLite / PostgreSQL
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Celtics Smart Parking System API",
    description="Центральний REST API бекенд смарт-паркінгу ТЦ (команда «Селтікс»)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS дозволяє фронтенду Андрущенка робити запити з будь-якого порту/домену
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Підключення роутерів
app.include_router(map_router.router)
app.include_router(res_router.router)
app.include_router(telemetry_router.router)

@app.get("/", tags=["Root"])
def root():
    return {
        "project": "Celtics Smart Parking System",
        "status": "online",
        "team": ["Савчук (Backend)", "Чабан (IoT)", "Андрущенко (Frontend)"],
        "docs_url": "/docs"
    }

@app.get("/health", tags=["Root"])
def healthcheck():
    return {"status": "healthy"}
