"""API models for the parking map and sensor telemetry."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ParkingStatus = Literal["free", "occupied"]
LEDColor = Literal["green", "red"]


class Coordinates(BaseModel):
    x: float
    y: float


class LEDIndicator(BaseModel):
    color: LEDColor
    hex_color: str
    mode: Literal["steady"] = "steady"


class SpotMapItem(BaseModel):
    id: int
    spot_code: str
    floor: int
    sector: str
    status: ParkingStatus
    coordinates: Coordinates
    led_indicator: LEDIndicator
    last_telemetry_at: datetime | None = None


class FloorSummary(BaseModel):
    floor: int
    total_spots: int
    free_spots: int
    occupied_spots: int
    is_full: bool


class ParkingSummary(BaseModel):
    total_spots: int
    free_spots: int
    occupied_spots: int
    is_parking_full: bool
    recommended_sector: str | None = None


class MapResponse(BaseModel):
    summary: ParkingSummary
    floors: list[FloorSummary]
    spots: list[SpotMapItem]


class SensorTelemetryRequest(BaseModel):
    device_id: str = Field(description="Unique ID of the sensor controller")
    spot_code: str = Field(description="Parking space code, such as A-01")
    floor: int | None = Field(None, description="Required when the code exists on multiple floors")
    distance_cm: float = Field(description="Distance measured by the sensor")
    raw_state: Literal[0, 1]
    is_occupied: bool
    timestamp: int = Field(description="Unix timestamp of the measurement")


class SensorTelemetryResponse(BaseModel):
    status: Literal["success"]
    spot_code: str
    led_color: LEDColor
    message: str
