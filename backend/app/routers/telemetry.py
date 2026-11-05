# TODO (Савчук): Роутер POST /api/v1/telemetry/sensor-event — прийом сигналу датчика ESP32, перевірка броні, нарахування штрафу
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/telemetry", tags=["IoT Telemetry"])
