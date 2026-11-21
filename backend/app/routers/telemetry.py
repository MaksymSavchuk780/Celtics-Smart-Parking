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

    active_reservation = next(
        (reservation for reservation in spot.reservations if reservation.status == "active"),
        None,
    )

    violation_detected = False
    fine_amount = 0.0
    if payload.is_occupied or payload.raw_state == 1:
        spot.status = "occupied"
    else:
        spot.status = "reserved" if active_reservation is not None else "free"

    spot.updated_at = utc_now()
    db.commit()
    db.refresh(spot)

    led_color = "red" if payload.is_occupied else ("blue" if spot.status == "reserved" else "green")
    return SensorTelemetryResponse(
        status="success",
        spot_code=spot.spot_code,
        led_color=led_color,
        violation_detected=violation_detected,
        fine_amount=fine_amount,
        message="Telemetry accepted and parking state updated",
    )
