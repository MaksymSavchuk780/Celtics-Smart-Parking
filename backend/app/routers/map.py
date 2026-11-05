# TODO (Савчук): Роутер GET /api/v1/map — видача карти всіх слотів для 2D-карти та табло
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/map", tags=["2D Map & Spots"])
