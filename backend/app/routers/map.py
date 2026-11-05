from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import ParkingSpot
from ..schemas import ParkingSpotResponse, Coordinates, LEDIndicator

router = APIRouter(prefix="/api/v1", tags=["2D Map & Spots"])

@router.get("/map", response_model=List[ParkingSpotResponse])
def get_parking_map(db: Session = Depends(get_db)):
    """
    US 1.2 & US 2.1: Отримання матриці всіх паркомісць для 2D-карти, LED-табло та дашборду ТЦ.
    """
    spots = db.query(ParkingSpot).all()
    results = []
    for s in spots:
        # Determine LED indicator color
        if s.status == "occupied":
            color, hex_val = "red", "#EF4444"
        elif s.status == "reserved":
            color, hex_val = "blue", "#3B82F6"
        else:
            color, hex_val = "green", "#22C55E"

        results.append(ParkingSpotResponse(
            id=s.id,
            spot_code=s.spot_code,
            floor=s.floor,
            sector=s.sector,
            status=s.status,
            coordinates=Coordinates(x=s.x_coord, y=s.y_coord),
            led_indicator=LEDIndicator(color=color, hex_color=hex_val, mode="steady")
        ))
    return results

@router.get("/spots/{spot_code}", response_model=ParkingSpotResponse)
def get_spot_by_code(spot_code: str, db: Session = Depends(get_db)):
    spot = db.query(ParkingSpot).filter(ParkingSpot.spot_code == spot_code).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Паркомісце не знайдено")
    color = "red" if spot.status == "occupied" else ("blue" if spot.status == "reserved" else "green")
    hex_val = "#EF4444" if color == "red" else ("#3B82F6" if color == "blue" else "#22C55E")
    return ParkingSpotResponse(
        id=spot.id,
        spot_code=spot.spot_code,
        floor=spot.floor,
        sector=spot.sector,
        status=spot.status,
        coordinates=Coordinates(x=spot.x_coord, y=spot.y_coord),
        led_indicator=LEDIndicator(color=color, hex_color=hex_val, mode="steady")
    )
