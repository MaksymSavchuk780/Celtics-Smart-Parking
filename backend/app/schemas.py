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
    id: int = Field(..., description="Унікальний числовий ID паркомісця в БД", examples=[1])
    spot_code: str = Field(..., description='Людиночитаний шифр місця для водія та табло, напр. "A-01"', examples=["A-01"])
    floor: int = Field(..., description="Номер поверху паркінгу (-1, 1, 2)", examples=[1])
    sector: str = Field(..., description='Літера сектора ("A", "B", "C")', examples=["A"])
    status: Literal["free", "occupied", "reserved"] = Field(..., description="Поточний логічний стан паркомісця", examples=["free"])
    coordinates: Coordinates = Field(..., description="Координати слота на SVG сітці 2D-карти ТЦ")
    led_indicator: LEDIndicator = Field(..., description="Стан та колір фізичного RGB-світлодіода над місцем")
    current_session: Optional[CurrentParkingSession] = Field(None, description="Інформація про поточну активну сесію паркування")
    active_reservation: Optional[ActiveReservation] = Field(None, description="Інформація про активну бронь на цьому слоті")
    last_telemetry_at: Optional[datetime] = Field(None, description="Час останнього сигналу від IoT-датчика або оновлення статусу", examples=["2026-11-19T20:30:00Z"])

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


# ============================================================
# 7. СХЕМИ 2D-КАРТИ ТА В'ЇЗНОГО LED-ТАБЛО (US 1.1, US 1.2)
# ============================================================

class SpotMapItem(ParkingSpotResponse):
    """Слот паркомісця для 2D-карти навігатора водія (сумісний із контрактом parking_spot_contract.json)"""
    pass


class FloorSummary(BaseModel):
    """Поверхова агрегація стану паркомісць для в'їзного LED-табло"""
    floor: int = Field(..., description="Номер поверху паркінгу (-1, 1, 2)", examples=[1])
    total_spots: int = Field(..., description="Загальна кількість паркомісць на цьому поверсі", examples=[25])
    free_spots: int = Field(..., description="Кількість вільних місць (status == 'free')", examples=[18])
    occupied_spots: int = Field(..., description="Кількість зайнятих місць (status == 'occupied')", examples=[5])
    reserved_spots: int = Field(..., description="Кількість заброньованих місць (status == 'reserved')", examples=[2])
    is_full: bool = Field(..., description="Прапорець повної заповненості поверху (True, якщо free_spots == 0)", examples=[False])

    model_config = ConfigDict(from_attributes=True)


class ParkingSummary(BaseModel):
    """Загальне зведення завантаженості паркінгу ТЦ"""
    total_spots: int = Field(..., description="Загальна кількість місць по всьому паркінгу", examples=[50])
    free_spots: int = Field(..., description="Загальна кількість вільних місць на паркінгу", examples=[35])
    occupied_spots: int = Field(..., description="Загальна кількість зайнятих місць", examples=[10])
    reserved_spots: int = Field(..., description="Загальна кількість заброньованих місць", examples=[5])
    is_parking_full: bool = Field(..., description="Чи заповнений весь паркінг повністю (free_spots == 0)", examples=[False])
    recommended_sector: Optional[str] = Field(None, description="Сектор із найбільшою кількістю вільних місць (або null, якщо вільних немає)", examples=["A"])

    model_config = ConfigDict(from_attributes=True)


class MapResponse(BaseModel):
    """Повна відповідь ендпоінта GET /api/v1/map для 2D-карти та поверхового LED-табло"""
    summary: ParkingSummary = Field(..., description="Загальне зведення лічильників паркінгу")
    floors: List[FloorSummary] = Field(..., description="Агреговані показники по кожному поверху для LED-табло")
    spots: List[SpotMapItem] = Field(..., description="Масив паркомісць із координатами для побудови 2D-карти")

    model_config = ConfigDict(from_attributes=True)

