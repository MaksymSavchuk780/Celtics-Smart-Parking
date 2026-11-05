# -*- coding: utf-8 -*-
"""
Celtics Smart Parking System — Pydantic Schemas & DTOs
Author: Савчук (Backend / Database Engineer)
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field

# -------------------------------------------------------------------------
# 1. СХЕМИ ПАРКОМІСЦЯ (Parking Spot DTOs)
# -------------------------------------------------------------------------

class Coordinates(BaseModel):
    x: float = Field(..., description="X-координата на 2D-карті (SVG сітка)")
    y: float = Field(..., description="Y-координата на 2D-карті (SVG сітка)")


class LEDIndicator(BaseModel):
    color: Literal["green", "red", "blue", "blink_red"] = Field(..., description="Колір RGB світлодіода")
    hex_color: str = Field(..., description="HEX-код для вебінтерфейсу")
    mode: Literal["steady", "blinking"] = Field("steady", description="Режим світіння")


class CurrentParkingSession(BaseModel):
    ticket_uid: str = Field(..., description="Унікальний ID талона, напр. TCK-8041")
    plate_number: str = Field(..., description="Держномер авто, напр. BC1234AB")
    entry_time: datetime = Field(..., description="Час заїзду")
    fine_amount: float = Field(0.0, description="Нарахований штраф")


class ActiveReservation(BaseModel):
    reservation_id: int
    plate_number: str
    reserved_from: datetime
    reserved_until: datetime


class ParkingSpotResponse(BaseModel):
    id: int
    spot_code: str = Field(..., description="Код місця, напр. A-01")
    floor: int = Field(..., description="Поверх (-1, 1, 2)")
    sector: str = Field(..., description="Сектор (A, B, C)")
    status: Literal["free", "occupied", "reserved"]
    coordinates: Coordinates
    led_indicator: LEDIndicator
    current_session: Optional[CurrentParkingSession] = None
    active_reservation: Optional[ActiveReservation] = None
    last_telemetry_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# -------------------------------------------------------------------------
# 2. СХЕМИ БРОНЮВАННЯ (Reservation DTOs)
# -------------------------------------------------------------------------

class ReservationCreate(BaseModel):
    plate_number: str = Field(..., example="BC 1234 AB", description="Номер автомобіля")
    spot_code: str = Field(..., example="A-18", description="Бажане паркомісце")
    reserved_from: datetime = Field(..., description="Початок броні")
    reserved_until: datetime = Field(..., description="Кінець броні")


class ReservationResponse(BaseModel):
    id: int
    plate_number: str
    spot_code: str
    status: str
    reserved_from: datetime
    reserved_until: datetime
    message: str


# -------------------------------------------------------------------------
# 3. СХЕМИ ТЕЛЕМЕТРІЇ ВІД ESP32 (IoT Telemetry DTOs)
# -------------------------------------------------------------------------

class SensorTelemetryRequest(BaseModel):
    device_id: str = Field(..., description="ID мікроконтролера ESP32, напр. ESP32_NODE_A01")
    spot_code: str = Field(..., description="Код паркомісця, прив'язаного до датчика")
    distance_cm: float = Field(..., description="Виміряна відстань ультразвуковим датчиком HC-SR04")
    raw_state: Literal[0, 1] = Field(..., description="Бінарний сигнал присутності")
    is_occupied: bool = Field(..., description="Статус зайнятості (distance_cm < 10)")
    detection_threshold_cm: float = Field(10.0, description="Поріг детекції")
    timestamp: int = Field(..., description="Unix timestamp заміру")


class RGBValues(BaseModel):
    r: int = Field(0, ge=0, le=255)
    g: int = Field(0, ge=0, le=255)
    b: int = Field(0, ge=0, le=255)


class LEDCommand(BaseModel):
    led_color: Literal["green", "red", "blue", "blink_red"]
    rgb_values: RGBValues


class SensorTelemetryResponse(BaseModel):
    status: Literal["success", "warning", "error"]
    spot_code: str
    command: LEDCommand
    violation_detected: bool = Field(False, description="Чи зафіксовано заїзд на чужу бронь")
    fine_amount: float = Field(0.0, description="Сума штрафу при порушенні")
    message: str = Field(..., description="Службове повідомлення бекенду")
