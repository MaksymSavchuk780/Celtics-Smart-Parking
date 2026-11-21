# -*- coding: utf-8 -*-
"""FastAPI endpoints for online parking reservations."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

try:
    from backend.app.database import get_db
    from backend.app.models import ParkingSpot, Reservation
    from backend.app.schemas import ReservationCreate, ReservationResponse
except ImportError:
    from app.database import get_db
    from app.models import ParkingSpot, Reservation
    from app.schemas import ReservationCreate, ReservationResponse


router = APIRouter(tags=["Reservations"])


def _reservation_response(reservation: Reservation) -> ReservationResponse:
    return ReservationResponse(
        id=reservation.id,
        plate_number=reservation.plate_number,
        spot_code=reservation.spot.spot_code,
        floor=reservation.spot.floor,
        reserved_from=reservation.reserved_from,
        reserved_until=reservation.reserved_until,
        status=reservation.status,
        message="Parking spot reserved successfully",
    )


@router.post("/reservations", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
def create_reservation(payload: ReservationCreate, db: Session = Depends(get_db)):
    if payload.reserved_until <= payload.reserved_from:
        raise HTTPException(status_code=422, detail="reserved_until must be after reserved_from")

    spots_query = db.query(ParkingSpot).filter(ParkingSpot.spot_code == payload.spot_code.strip().upper())
    if payload.floor is not None:
        spots_query = spots_query.filter(ParkingSpot.floor == payload.floor)
    spots = spots_query.all()
    if not spots:
        raise HTTPException(status_code=404, detail="Parking spot not found")
    if len(spots) > 1:
        raise HTTPException(status_code=422, detail="floor is required when spot_code exists on multiple floors")
    spot = spots[0]
    if spot.status == "occupied":
        raise HTTPException(status_code=409, detail="Parking spot is occupied")

    overlap = (
        db.query(Reservation)
        .filter(
            Reservation.spot_id == spot.id,
            Reservation.status.in_(["pending", "active"]),
            Reservation.reserved_from < payload.reserved_until,
            Reservation.reserved_until > payload.reserved_from,
        )
        .first()
    )
    if overlap is not None:
        raise HTTPException(status_code=409, detail="Parking spot already reserved for this time")

    reservation = Reservation(
        plate_number=payload.plate_number.strip().upper(),
        spot_id=spot.id,
        reserved_from=payload.reserved_from,
        reserved_until=payload.reserved_until,
        status="active",
    )
    spot.status = "reserved"
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    db.refresh(spot)
    return _reservation_response(reservation)


@router.get("/reservations", response_model=list[ReservationResponse])
def list_reservations(db: Session = Depends(get_db)):
    reservations = db.query(Reservation).order_by(Reservation.created_at.desc()).all()
    return [_reservation_response(item) for item in reservations]


@router.delete("/reservations/{reservation_id}", response_model=ReservationResponse)
def cancel_reservation(reservation_id: int, db: Session = Depends(get_db)):
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if reservation is None:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if reservation.status == "cancelled":
        return _reservation_response(reservation)

    reservation.status = "cancelled"
    if reservation.spot.status == "reserved":
        reservation.spot.status = "free"
    db.commit()
    db.refresh(reservation)
    return _reservation_response(reservation)
