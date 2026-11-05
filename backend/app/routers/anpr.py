# TODO (Савчук): Роутер POST /api/v1/anpr/entry — фіксація держномера на шлагбаумі та видача талона (Ticket ID)
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/anpr", tags=["ANPR Barrier"])
