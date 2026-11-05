# -*- coding: utf-8 -*-
"""
Celtics Smart Parking System — Pydantic Schemas & DTOs
Результат виконаного завдання №1 Савчука (US 3.1)
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field

# 1. СХЕМИ ПАРКОМІСЦЯ (US 1.2, 2.1)
class Coordinates(BaseModel):
    x: float
    y: float

class LEDIndicator(BaseModel):
    color: Literal["green", "red", "blue", "blink_red"]
    hex_color: str
    mode: Literal["steady", "blinking"] = "steady"

class CurrentParkingSession(BaseModel):
    ticket_uid: str
    plate_number: str
    entry_time: datetime
    fine_amount: float = 0.0

class ActiveReservation(BaseModel):
    reservation_id: int
    plate_number: str
    reserved_from: datetime
    reserved_until: datetime

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

# 2. СХЕМИ БРОНЮВАННЯ (US 1.5)
class ReservationCreate(BaseModel):
    plate_number: str
    spot_code: str
    reserved_from: datetime
    reserved_until: datetime

class ReservationResponse(BaseModel):
    id: int
    plate_number: str
    spot_code: str
    status: str
    message: str

# 3. СХЕМИ ТЕЛЕМЕТРІЇ ВІД ДАТЧИКА (US 3.3, 3.5)
class SensorTelemetryRequest(BaseModel):
    device_id: str
    spot_code: str
    distance_cm: float
    raw_state: Literal[0, 1]
    is_occupied: bool
    timestamp: int

class SensorTelemetryResponse(BaseModel):
    status: Literal["success", "warning", "error"]
    spot_code: str
    led_color: Literal["green", "red", "blue", "blink_red"]
    violation_detected: bool = False
    fine_amount: float = 0.0
    message: str
