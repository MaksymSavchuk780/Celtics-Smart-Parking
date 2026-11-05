from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..models import ParkingSpot, Reservation, ViolationLog, TicketSession
from ..schemas import SensorTelemetryRequest, SensorTelemetryResponse, LEDCommand, RGBValues

router = APIRouter(prefix="/api/v1/telemetry", tags=["IoT Telemetry"])

@router.post("/sensor-event", response_model=SensorTelemetryResponse)
def handle_sensor_telemetry(payload: SensorTelemetryRequest, db: Session = Depends(get_db)):
    """
    US 3.3 & US 3.5: Прийом пакету телеметрії від плати ESP32 з датчиком HC-SR04.
    Кореляція події, захист броні та повернення команди для RGB-світлодіода.
    """
    spot = db.query(ParkingSpot).filter(ParkingSpot.spot_code == payload.spot_code).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Паркомісце не знайдено")

    # Якщо місце звільнилося (відстань > 10 см)
    if not payload.is_occupied:
        # Перевіряємо чи була активна бронь
        active_res = db.query(Reservation).filter(
            Reservation.spot_id == spot.id,
            Reservation.status == "active"
        ).first()
        if active_res:
            spot.status = "reserved"
            return SensorTelemetryResponse(
                status="success",
                spot_code=spot.spot_code,
                command=LEDCommand(led_color="blue", rgb_values=RGBValues(r=0, g=0, b=255)),
                violation_detected=False,
                fine_amount=0.0,
                message="Slot is free but RESERVED. LED set to BLUE."
            )
        else:
            spot.status = "free"
            db.commit()
            return SensorTelemetryResponse(
                status="success",
                spot_code=spot.spot_code,
                command=LEDCommand(led_color="green", rgb_values=RGBValues(r=0, g=255, b=0)),
                violation_detected=False,
                fine_amount=0.0,
                message="Slot is FREE. LED set to GREEN."
            )

    # Якщо місце зайняли (машина припаркувалася, is_occupied == True)
    # Перевіряємо, чи це місце було заброньоване
    active_res = db.query(Reservation).filter(
        Reservation.spot_id == spot.id,
        Reservation.status == "active"
    ).first()

    if active_res:
        # В реальній системі тут перевіряється зіставлення з ANPR сесією.
        # Для демонстрації порушення (сценарій 4):
        # Якщо заїхав порушник (напр. чуже авто) -> штраф +500 грн!
        spot.status = "occupied"
        violation = ViolationLog(
            spot_id=spot.id,
            timestamp=datetime.utcnow(),
            fine_reason=f"Unauthorized parking on reserved spot {spot.spot_code}",
            resolved=False
        )
        db.add(violation)
        db.commit()

        return SensorTelemetryResponse(
            status="warning",
            spot_code=spot.spot_code,
            command=LEDCommand(led_color="blink_red", rgb_values=RGBValues(r=255, g=0, b=0)),
            violation_detected=True,
            fine_amount=500.0,
            message=f"UNAUTHORIZED_PARKING: Slot {spot.spot_code} was reserved! Fine +500 UAH issued."
        )

    # Звичайне успішне паркування на вільному зеленому місці
    spot.status = "occupied"
    db.commit()
    return SensorTelemetryResponse(
        status="success",
        spot_code=spot.spot_code,
        command=LEDCommand(led_color="red", rgb_values=RGBValues(r=255, g=0, b=0)),
        violation_detected=False,
        fine_amount=0.0,
        message=f"Slot {spot.spot_code} occupied normally. LED set to RED."
    )
