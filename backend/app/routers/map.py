"""Read parking availability for the floor map and entrance display."""

from collections import Counter, defaultdict
from datetime import timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

try:
    from backend.app.database import get_db
    from backend.app.models import ParkingSpot
    from backend.app.schemas import Coordinates, FloorSummary, LEDIndicator, MapResponse, ParkingSummary, SpotMapItem
except ImportError:
    from app.database import get_db
    from app.models import ParkingSpot
    from app.schemas import Coordinates, FloorSummary, LEDIndicator, MapResponse, ParkingSummary, SpotMapItem


router = APIRouter(tags=["Map & LED Display"])


def build_spot_item(spot: ParkingSpot) -> SpotMapItem:
    led = (
        LEDIndicator(color="green", hex_color="#22C55E")
        if spot.status == "free"
        else LEDIndicator(color="red", hex_color="#EF4444")
    )
    last_update = spot.updated_at or spot.created_at
    if last_update is not None and last_update.tzinfo is None:
        last_update = last_update.replace(tzinfo=timezone.utc)
    return SpotMapItem(
        id=spot.id,
        spot_code=spot.spot_code,
        floor=spot.floor,
        sector=spot.sector,
        status=spot.status,
        coordinates=Coordinates(x=spot.x_coord, y=spot.y_coord),
        led_indicator=led,
        last_telemetry_at=last_update,
    )


@router.get(
    "/map",
    response_model=MapResponse,
    summary="Get parking availability",
    description="Return garage and floor totals, plus individual spaces. Floor and sector filters apply to the space list.",
)
@router.get("/map/", response_model=MapResponse, include_in_schema=False)
def get_parking_map(
    floor: int | None = Query(None, description="Filter spaces by floor", examples=[1]),
    sector: str | None = Query(None, description="Filter spaces by sector", examples=["A"]),
    db: Session = Depends(get_db),
) -> MapResponse:
    spots = db.query(ParkingSpot).order_by(ParkingSpot.floor, ParkingSpot.spot_code).all()
    floor_counts: dict[int, Counter[str]] = defaultdict(Counter)
    free_by_sector: Counter[str] = Counter()
    visible_spots = []
    wanted_sector = sector.upper() if sector is not None else None

    for spot in spots:
        floor_counts[spot.floor][spot.status] += 1
        if spot.status == "free":
            free_by_sector[spot.sector.upper()] += 1
        if (floor is None or spot.floor == floor) and (wanted_sector is None or spot.sector.upper() == wanted_sector):
            visible_spots.append(build_spot_item(spot))

    floors = [
        FloorSummary(
            floor=number,
            total_spots=counts["free"] + counts["occupied"],
            free_spots=counts["free"],
            occupied_spots=counts["occupied"],
            is_full=counts["free"] == 0,
        )
        for number, counts in sorted(floor_counts.items())
    ]
    free_spots = sum(floor.free_spots for floor in floors)
    recommended_sector = min(free_by_sector, key=lambda name: (-free_by_sector[name], name), default=None)

    return MapResponse(
        summary=ParkingSummary(
            total_spots=len(spots),
            free_spots=free_spots,
            occupied_spots=len(spots) - free_spots,
            is_parking_full=free_spots == 0,
            recommended_sector=recommended_sector,
        ),
        floors=floors,
        spots=visible_spots,
    )
