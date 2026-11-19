# -*- coding: utf-8 -*-
"""
Celtics Smart Parking System — Map & LED Display Router
Ендпоінт GET /api/v1/map:
1. Поверхова агрегація вільних місць для в'їзного LED-табло
2. Загальний блок лічильників (summary) та рекомендація сектора
3. Повний масив паркомісць із координатами (x, y) для 2D-карти навігатора
"""

import sys
from pathlib import Path
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session, selectinload

APP_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = APP_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

for p in (PROJECT_ROOT, BACKEND_DIR, APP_DIR):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

try:
    from backend.app.database import get_db
    from backend.app.models import ParkingSpot, TicketSession, Reservation, ViolationLog
    from backend.app.schemas import (
        MapResponse,
        ParkingSummary,
        FloorSummary,
        SpotMapItem,
        Coordinates,
        LEDIndicator,
        CurrentParkingSession,
        ActiveReservation
    )
except ImportError:
    from app.database import get_db
    from app.models import ParkingSpot, TicketSession, Reservation, ViolationLog
    from app.schemas import (
        MapResponse,
        ParkingSummary,
        FloorSummary,
        SpotMapItem,
        Coordinates,
        LEDIndicator,
        CurrentParkingSession,
        ActiveReservation
    )

router = APIRouter(tags=["Map & LED Display"])


def build_spot_item(spot: ParkingSpot) -> SpotMapItem:
    """Формує DTO об'єкта паркомісця згідно з контрактом parking_spot_contract.json"""
    # 1. Визначення стану LED-індикатора над слотом
    unresolved_violations = [v for v in spot.violations if not getattr(v, "resolved", False)]
    if unresolved_violations:
        led = LEDIndicator(color="blink_red", hex_color="#EF4444", mode="blinking")
    elif spot.status == "reserved":
        led = LEDIndicator(color="blue", hex_color="#3B82F6", mode="steady")
    elif spot.status == "occupied":
        led = LEDIndicator(color="red", hex_color="#EF4444", mode="steady")
    else:
        led = LEDIndicator(color="green", hex_color="#22C55E", mode="steady")

    # 2. Поточна активна паркувальна сесія
    current_session = None
    for s in spot.sessions:
        if getattr(s, "is_active", False):
            current_session = CurrentParkingSession(
                ticket_uid=s.ticket_uid,
                plate_number=s.plate_number,
                entry_time=s.entry_time,
                fine_amount=s.fine_amount or 0.0
            )
            break

    # 3. Активна бронь
    active_reservation = None
    for r in spot.reservations:
        if getattr(r, "status", "active") == "active":
            active_reservation = ActiveReservation(
                reservation_id=r.id,
                plate_number=r.plate_number,
                reserved_from=r.reserved_from,
                reserved_until=r.reserved_until
            )
            break

    return SpotMapItem(
        id=spot.id,
        spot_code=spot.spot_code,
        floor=spot.floor,
        sector=spot.sector,
        status=spot.status,
        coordinates=Coordinates(x=spot.x_coord, y=spot.y_coord),
        led_indicator=led,
        current_session=current_session,
        active_reservation=active_reservation,
        last_telemetry_at=spot.updated_at or spot.created_at
    )


@router.get(
    "/map",
    response_model=MapResponse,
    status_code=status.HTTP_200_OK,
    summary="Отримання даних карти паркінгу та статусів для LED-табло",
    description=(
        "Повертає поверхову агрегацію вільних місць для в'їзного LED-табло, "
        "загальну статистику паркінгу та повний масив слотів із координатами (x, y) "
        "для 2D-карти водія. Підтримує опціональну фільтрацію слотів за floor та sector."
    )
)
@router.get(
    "/map/",
    response_model=MapResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False
)
def get_parking_map(
    floor: Optional[int] = Query(None, description="Фільтр паркомісць за поверхом (-1, 1, 2)", examples=[1]),
    sector: Optional[str] = Query(None, description="Фільтр паркомісць за сектором ('A', 'B', 'C')", examples=["A"]),
    db: Session = Depends(get_db)
) -> MapResponse:
    """
    Обробник GET /api/v1/map:
    - Обчислює поверхові лічильники (total, free, occupied, reserved, is_full)
    - Обчислює загальний звіт (summary) та рекомендований сектор
    - Повертає список слотів із фільтрацією за query-параметрами
    """
    # Завантажуємо всі паркомісця з БД із жадібним завантаженням пов'язаних сутностей
    all_spots = (
        db.query(ParkingSpot)
        .options(
            selectinload(ParkingSpot.sessions),
            selectinload(ParkingSpot.reservations),
            selectinload(ParkingSpot.violations)
        )
        .order_by(ParkingSpot.floor.asc(), ParkingSpot.spot_code.asc())
        .all()
    )

    # 1. Поверхова агрегація (для в'їзного LED-табло)
    floors_data: Dict[int, Dict[str, int]] = {}
    sector_free_counts: Dict[str, int] = {}

    for s in all_spots:
        f = s.floor
        if f not in floors_data:
            floors_data[f] = {"total": 0, "free": 0, "occupied": 0, "reserved": 0}

        floors_data[f]["total"] += 1
        if s.status == "free":
            floors_data[f]["free"] += 1
            sec = s.sector.upper()
            sector_free_counts[sec] = sector_free_counts.get(sec, 0) + 1
        elif s.status == "occupied":
            floors_data[f]["occupied"] += 1
        elif s.status == "reserved":
            floors_data[f]["reserved"] += 1

    floor_summaries: List[FloorSummary] = []
    for f in sorted(floors_data.keys()):
        fd = floors_data[f]
        floor_summaries.append(
            FloorSummary(
                floor=f,
                total_spots=fd["total"],
                free_spots=fd["free"],
                occupied_spots=fd["occupied"],
                reserved_spots=fd["reserved"],
                is_full=(fd["free"] == 0)
            )
        )

    # 2. Загальний блок summary по всьому паркінгу
    total_spots = len(all_spots)
    free_spots = sum(1 for s in all_spots if s.status == "free")
    occupied_spots = sum(1 for s in all_spots if s.status == "occupied")
    reserved_spots = sum(1 for s in all_spots if s.status == "reserved")
    is_parking_full = (free_spots == 0)

    recommended_sector: Optional[str] = None
    if sector_free_counts:
        max_free = max(sector_free_counts.values())
        if max_free > 0:
            top_sectors = [sec for sec, count in sector_free_counts.items() if count == max_free]
            recommended_sector = sorted(top_sectors)[0]

    summary = ParkingSummary(
        total_spots=total_spots,
        free_spots=free_spots,
        occupied_spots=occupied_spots,
        reserved_spots=reserved_spots,
        is_parking_full=is_parking_full,
        recommended_sector=recommended_sector
    )

    # 3. Фільтрація масиву паркомісць для 2D-карти
    filtered_spots = all_spots
    if floor is not None:
        filtered_spots = [s for s in filtered_spots if s.floor == floor]
    if sector is not None:
        filtered_spots = [s for s in filtered_spots if s.sector.upper() == sector.upper()]

    spots_response: List[SpotMapItem] = [build_spot_item(s) for s in filtered_spots]

    return MapResponse(
        summary=summary,
        floors=floor_summaries,
        spots=spots_response
    )
