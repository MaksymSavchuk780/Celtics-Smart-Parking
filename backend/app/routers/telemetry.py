# -*- coding: utf-8 -*-
"""FastAPI endpoint for ESP32 parking sensor telemetry."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

try:
    from backend.app.database import get_db
    from backend.app.models import ParkingSpot, utc_now
    from backend.app.schemas import SensorTelemetryRequest, SensorTelemetryResponse
except ImportError:
    from app.database import get_db
    from app.models import ParkingSpot, utc_now
    from app.schemas import SensorTelemetryRequest, SensorTelemetryResponse


router = APIRouter(tags=["Telemetry"])


@router.post("/telemetry/sensor-event", response_model=SensorTelemetryResponse)
def sensor_event(payload: SensorTelemetryRequest, db: Session = Depends(get_db)):
    spots_query = db.query(ParkingSpot).filter(ParkingSpot.spot_code == payload.spot_code.strip().upper())
    if payload.floor is not None:
        spots_query = spots_query.filter(ParkingSpot.floor == payload.floor)
    spots = spots_query.all()
    if not spots:
        raise HTTPException(status_code=404, detail="Parking spot not found")
    if len(spots) > 1:
        raise HTTPException(status_code=422, detail="floor is required when spot_code exists on multiple floors")
    spot = spots[0]

    occupied = payload.is_occupied or payload.raw_state == 1
    spot.status = "occupied" if occupied else "free"
    spot.updated_at = utc_now()
    spot_code = spot.spot_code
    db.commit()

    return SensorTelemetryResponse(
        status="success",
        spot_code=spot_code,
        led_color="red" if occupied else "green",
        message="Telemetry accepted and parking state updated",
    )
