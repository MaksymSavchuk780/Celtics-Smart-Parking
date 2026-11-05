from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..models import ParkingSpot, Reservation
from ..schemas import ReservationCreate, ReservationResponse

router = APIRouter(prefix="/api/v1/reservations", tags=["Reservations"])

@router.post("", response_model=ReservationResponse)
def create_reservation(data: ReservationCreate, db: Session = Depends(get_db)):
    """
    US 1.5: Попереднє онлайн-бронювання місця на сайті ТЦ.
    Переводить індикатор у статус 'reserved' (синій колір).
    """
    spot = db.query(ParkingSpot).filter(ParkingSpot.spot_code == data.spot_code).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Вказане паркомісце не існує")
    if spot.status != "free":
        raise HTTPException(status_code=400, detail="Місце вже зайняте або заброньоване")

    # Створення запису бронювання
    res = Reservation(
        plate_number=data.plate_number.replace(" ", "").upper(),
        spot_id=spot.id,
        reserved_from=data.reserved_from,
        reserved_until=data.reserved_until,
        status="active"
    )
    db.add(res)
    # Оновлення статусу місця на reserved
    spot.status = "reserved"
    db.commit()
    db.refresh(res)

    return ReservationResponse(
        id=res.id,
        plate_number=res.plate_number,
        spot_code=spot.spot_code,
        status="active",
        reserved_from=res.reserved_from,
        reserved_until=res.reserved_until,
        message=f"Місце {spot.spot_code} успішно заброньовано для {res.plate_number}. LED переведено в СИНІЙ колір."
    )
