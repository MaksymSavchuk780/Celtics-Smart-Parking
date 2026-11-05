# TODO (Савчук): Роутер POST /api/v1/reservations — онлайн-бронювання слота зі зміною на status: reserved
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/reservations", tags=["Reservations"])
