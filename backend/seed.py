"""Populate an empty parking database with three floors of demo spaces."""

import sys
from pathlib import Path

if not __package__:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.database import SessionLocal, init_db
from backend.app.models import ParkingSpot


def seed_database():
    init_db()
    rows = [("A", 75.0), ("B", 205.0), ("C", 275.0), ("D", 405.0), ("E", 475.0), ("F", 605.0)]
    occupied_spots = {(-1, "F-03"), (1, "A-05"), (1, "B-02"), (2, "B-12"), (2, "C-10")}

    with SessionLocal.begin() as session:
        if session.query(ParkingSpot.id).first() is not None:
            print("Parking spaces already exist.")
            return

        spots = []
        for floor in (-1, 1, 2):
            for sector, y in rows:
                for column in range(17):
                    if sector in {"B", "C"} and column in {7, 8}:
                        continue
                    code = f"{sector}-{column + 1:02d}"
                    spots.append(ParkingSpot(
                        spot_code=code,
                        floor=floor,
                        sector=sector,
                        status="occupied" if (floor, code) in occupied_spots else "free",
                        x_coord=171.0 + 40.0 * column,
                        y_coord=y,
                    ))
        session.add_all(spots)

    print(f"Created {len(spots)} demo parking spaces.")


if __name__ == "__main__":
    seed_database()
