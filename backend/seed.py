# -*- coding: utf-8 -*-
"""
Celtics Smart Parking System — Seed Script
Fills database with 50 parking spots across 3 floors (-1, 1, 2)
Author: Савчук (Backend / Database Engineer)
"""

from datetime import datetime, timedelta
from app.database import SessionLocal, engine, Base
from app.models import ParkingSpot, Reservation

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Очищення старих даних для чистого старту
    db.query(Reservation).delete()
    db.query(ParkingSpot).delete()
    db.commit()

    print("Seeding parking spots...")
    spots = []

    # Поверх 1: Сектор А (20 місць)
    for i in range(1, 21):
        spot_code = f"A-{i:02d}"
        status = "free"
        x = 50.0 + (i % 10) * 80.0
        y = 100.0 if i <= 10 else 220.0
        spots.append(ParkingSpot(
            spot_code=spot_code,
            floor=1,
            sector="A",
            status=status,
            x_coord=x,
            y_coord=y
        ))

    # Поверх 1: Сектор Б (15 місць)
    for i in range(1, 16):
        spot_code = f"B-{i:02d}"
        status = "free"
        x = 50.0 + (i % 8) * 85.0
        y = 350.0 if i <= 8 else 470.0
        spots.append(ParkingSpot(
            spot_code=spot_code,
            floor=1,
            sector="B",
            status=status,
            x_coord=x,
            y_coord=y
        ))

    # Поверх -1: Підземний паркінг (15 місць)
    for i in range(1, 16):
        spot_code = f"U-{i:02d}"
        status = "free"
        x = 60.0 + (i % 8) * 80.0
        y = 120.0 if i <= 8 else 240.0
        spots.append(ParkingSpot(
            spot_code=spot_code,
            floor=-1,
            sector="U",
            status=status,
            x_coord=x,
            y_coord=y
        ))

    db.add_all(spots)
    db.commit()

    # Створюємо 2 тестові бронювання (місця A-15 та A-18)
    spot_a18 = db.query(ParkingSpot).filter(ParkingSpot.spot_code == "A-18").first()
    if spot_a18:
        spot_a18.status = "reserved"
        res = Reservation(
            plate_number="BC1234AB",
            spot_id=spot_a18.id,
            reserved_from=datetime.utcnow() - timedelta(minutes=15),
            reserved_until=datetime.utcnow() + timedelta(hours=2),
            status="active"
        )
        db.add(res)

    db.commit()
    print(f"Successfully created {len(spots)} parking spots! Seed complete.")
    db.close()

if __name__ == "__main__":
    seed_database()
