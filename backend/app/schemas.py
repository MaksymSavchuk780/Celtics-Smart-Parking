# -*- coding: utf-8 -*-
"""
Celtics Smart Parking System — Pydantic Schemas & DTOs
Схеми валідації запитів та відповідей для FastAPI / Flask REST API
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict


# ============================================================
# 1. ДОПОМІЖНІ СХЕМИ
# ============================================================

class Coordinates(BaseModel):
    """Координати слота на SVG сітці 2D-карти ТЦ"""
    x: float = Field(..., description="X-координата")
    y: float = Field(..., description="Y-координата")

    model_config = ConfigDict(from_attributes=True)


class LEDIndicator(BaseModel):
    """Стан RGB-світлодіода над місцем"""
    color: Literal["green", "red", "blue", "blink_red"] = Field(..., description="Колір індикатора")
    hex_color: str = Field(..., description="HEX-код кольору, напр. #22C55E")
    mode: Literal["steady", "blinking"] = Field("steady", description="Режим світіння")

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# 2. СХЕМИ ПАРКОМІСЦЯ (US 1.1, US 1.2, US 2.1)
# ============================================================

class ParkingSpotBase(BaseModel):
    spot_code: str = Field(..., description='Людиночитаний код місця, напр. "A-01"')
    floor: int = Field(..., description="Поверх паркінгу (-1, 1, 2)")
    sector: str = Field(..., description="Сектор (A, B, C)")
    status: Literal["free", "occupied", "reserved"] = Field("free", description="Статус місця")
    x_coord: float = Field(..., description="X координата на 2D-карті")
    y_coord: float = Field(..., description="Y координата на 2D-карті")


class ParkingSpotCreate(ParkingSpotBase):
    pass


class CurrentParkingSession(BaseModel):
    ticket_uid: str
    plate_number: str
    entry_time: datetime
    fine_amount: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class ActiveReservation(BaseModel):
    reservation_id: int
    plate_number: str
    reserved_from: datetime
    reserved_until: datetime

    model_config = ConfigDict(from_attributes=True)


class ParkingSpotResponse(BaseModel):
    id: int
    spot_code: str
    floor: int
    sector: str
    status: Literal["free", "occupied", "reserved"]
    coordinates: Coordinates
    led_indicator: LEDIndicator
    current_session: Optional[CurrentParkingSession] = None
    active_reservation: Optional[ActiveReservation] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# 3. СХЕМИ ТАЛОНІВ ТА ПАРКУВАЛЬНИХ СЕСІЙ (US 3.3)
# ============================================================

class TicketSessionCreate(BaseModel):
    plate_number: str = Field(..., description="Розпізнаний камерою держномер авто")
    spot_id: Optional[int] = Field(None, description="ID паркомісця (якщо відоме)")


class TicketSessionResponse(BaseModel):
    id: int
    ticket_uid: str
    plate_number: str
    entry_time: datetime
    spot_id: Optional[int] = None
    fine_amount: float = 0.0
    is_active: bool
    exit_time: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# 4. СХЕМИ ОНЛАЙН-БРОНЮВАННЯ (US 1.5)
# ============================================================

class ReservationCreate(BaseModel):
    plate_number: str = Field(..., description="Держномер авто клієнта")
    spot_code: str = Field(..., description="Код бажаного паркомісця")
    reserved_from: datetime = Field(..., description="Час початку броні")
    reserved_until: datetime = Field(..., description="Час закінчення броні")


class ReservationResponse(BaseModel):
    id: int
    plate_number: str
    spot_code: str
    reserved_from: datetime
    reserved_until: datetime
    status: str
    message: str

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# 5. СХЕМИ ТЕЛЕМЕТРІЇ ВІД ДАТЧИКА ESP32 (US 3.3, US 3.5)
# ============================================================

class SensorTelemetryRequest(BaseModel):
    device_id: str = Field(..., description="MAC / ID контролера ESP32")
    spot_code: str = Field(..., description="Код паркомісця")
    distance_cm: float = Field(..., description="Виміряна відстань ультразвуком")
    raw_state: Literal[0, 1] = Field(..., description="0 - порожньо, 1 - авто присутнє")
    is_occupied: bool = Field(..., description="Логічний прапорець зайнятості")
    timestamp: int = Field(..., description="Unix timestamp моменту заміру")


class SensorTelemetryResponse(BaseModel):
    status: Literal["success", "warning", "error"]
    spot_code: str
    led_color: Literal["green", "red", "blue", "blink_red"]
    violation_detected: bool = False
    fine_amount: float = 0.0
    message: str


# ============================================================
# 6. СХЕМИ ЖУРНАЛУ ПОРУШЕНЬ (US 2.5)
# ============================================================

class ViolationLogCreate(BaseModel):
    spot_id: int
    ticket_id: Optional[int] = None
    fine_reason: str


class ViolationLogResponse(BaseModel):
    id: int
    spot_id: int
    ticket_id: Optional[int] = None
    timestamp: datetime
    fine_reason: str
    resolved: bool

    model_config = ConfigDict(from_attributes=True)
