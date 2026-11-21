# -*- coding: utf-8 -*-
"""
Celtics Smart Parking System — Database Seeder Script
Автоматично генерує базу даних SQLite (parking.db) із:
- 294 паркомісцями (3 поверхи по 98 слотів, як у frontend-макеті)
- X, Y координатами на сітці для 2D-карти
- Тестовими онлайн-бронюваннями на сайті ТЦ
- Активними паркувальними сесіями та талонами
- Журналом порушень зі штрафом +500 грн
"""

import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Додаємо корінь проєкту та backend/ до sys.path для підтримки будь-якого способу запуску
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

try:
    from backend.app.database import engine, SessionLocal, init_db, drop_db, DEFAULT_DB_FILE
    from backend.app.models import ParkingSpot, TicketSession, Reservation, ViolationLog
except ImportError:
    from app.database import engine, SessionLocal, init_db, drop_db, DEFAULT_DB_FILE
    from app.models import ParkingSpot, TicketSession, Reservation, ViolationLog


def utc_now():
    """Повертає поточний час UTC без часового поясу для сумісності з SQLite"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def seed_database():
    print("=" * 60)
    print("Celtics Smart Parking System • Database Seeder")
    print("=" * 60)
    print(f"Цільова база даних: {DEFAULT_DB_FILE}")

    # 1. Створення таблиць
    print("-> Очищення та створення структури таблиць (DDL)...")
    drop_db()
    init_db()

    session = SessionLocal()
    try:
        # 2. Генерація тієї самої геометрії, що й frontend-макет:
        # 98 слотів на кожному з трьох поверхів = 294 слоти.
        print("-> Генерація 294 паркомісць на поверхах -1, 1 та 2...")

        spots_dict = {}
        rows = [
            ("A", 75.0, 0),
            ("B", 205.0, 0),
            ("C", 275.0, 1),
            ("D", 405.0, 1),
            ("E", 475.0, 2),
            ("F", 605.0, 2),
        ]
        floors = [-1, 1, 2]
        reserved_spots = {(1, "A-01"), (1, "B-04"), (2, "C-02")}
        occupied_spots = {
            (-1, "F-03"),
            (1, "A-05"),
            (1, "B-02"),
            (2, "B-12"),
            (2, "C-08"),
        }

        for floor in floors:
            for row, y, _aisle in rows:
                for column in range(17):
                    if row in {"B", "C"} and column in {7, 8}:
                        continue
                    spot_code = f"{row}-{column + 1:02d}"
                    status = (
                        "reserved"
                        if (floor, spot_code) in reserved_spots
                        else "occupied"
                        if (floor, spot_code) in occupied_spots
                        else "free"
                    )
                    spot = ParkingSpot(
                        spot_code=spot_code,
                        floor=floor,
                        sector=row,
                        status=status,
                        x_coord=190.0 + (40.0 * column) - 19.0,
                        y_coord=y,
                    )
                    session.add(spot)
                    spots_dict[(floor, spot_code)] = spot

        session.commit()
        print(f"   [OK] Створено {len(spots_dict)} паркомісць.")

        def spot_at(floor, code):
            return spots_dict[(floor, code)]

        # 3. Тестові онлайн-бронювання на сайті ТЦ
        print("-> Додавання тестових веб-бронювань...")
        now = utc_now()
        res1 = Reservation(
            plate_number="BC1234AB",
            spot_id=spot_at(1, "A-01").id,
            reserved_from=now - timedelta(minutes=10),
            reserved_until=now + timedelta(hours=2),
            status="active"
        )
        res2 = Reservation(
            plate_number="KA7788OO",
            spot_id=spot_at(1, "B-04").id,
            reserved_from=now,
            reserved_until=now + timedelta(hours=3),
            status="active"
        )
        res3 = Reservation(
            plate_number="AA5555II",
            spot_id=spot_at(2, "C-02").id,
            reserved_from=now + timedelta(minutes=30),
            reserved_until=now + timedelta(hours=2, minutes=30),
            status="active"
        )
        session.add_all([res1, res2, res3])
        session.commit()
        print("   [OK] Створено 3 активні бронювання (BC1234AB -> A-01, KA7788OO -> B-04, AA5555II -> C-02).")

        # 4. Тестові паркувальні сесії та талони (в'їзд через шлагбаум)
        print("-> Додавання тестових паркувальних сесій та талонів...")
        # Сесія 1: Водій припаркований на заброньованому ним місці A-01
        sess1 = TicketSession(
            ticket_uid="TCK-8041",
            plate_number="BC1234AB",
            spot_id=spot_at(1, "A-01").id,
            entry_time=now - timedelta(minutes=15),
            fine_amount=0.0,
            is_active=True
        )
        # Сесія 2: Порушник, який став на чужу броню та отримав штраф +500 грн
        sess2 = TicketSession(
            ticket_uid="TCK-8049",
            plate_number="KA9911AX",
            spot_id=spot_at(1, "B-02").id,
            entry_time=now - timedelta(minutes=45),
            fine_amount=500.0,
            is_active=True
        )
        # Сесія 3: Звичайний водій без броні на вільному місці A-05
        sess3 = TicketSession(
            ticket_uid="TCK-8052",
            plate_number="LV4510CX",
            spot_id=spot_at(1, "A-05").id,
            entry_time=now - timedelta(minutes=30),
            fine_amount=0.0,
            is_active=True
        )
        session.add_all([sess1, sess2, sess3])
        session.commit()
        print("   [OK] Створено 3 паркувальні сесії (TCK-8041, TCK-8049 зі штрафом +500 грн, TCK-8052).")

        # 5. Запис у журнал порушень
        print("-> Додавання запису про інцидент у violations_log...")
        violation = ViolationLog(
            ticket_id=sess2.id,
            spot_id=spot_at(1, "B-02").id,
            timestamp=now - timedelta(minutes=40),
            fine_reason="Unauthorized parking on reserved spot: automatic fine +500 UAH applied to ticket TCK-8049",
            resolved=False
        )
        session.add(violation)
        session.commit()
        print("   [OK] Створено 1 запис у журналі порушень.")

        print("=" * 60)
        print(" Успіх! База даних parking.db успішно згенерована та заповнена!")
        print("=" * 60)
        print(f"Всього паркомісць: {session.query(ParkingSpot).count()}")
        print(f"- Поверх -1: {session.query(ParkingSpot).filter_by(floor=-1).count()} місць")
        print(f"- Поверх 1: {session.query(ParkingSpot).filter_by(floor=1).count()} місць")
        print(f"- Поверх 2: {session.query(ParkingSpot).filter_by(floor=2).count()} місць")
        print(f"Статуси місць: {session.query(ParkingSpot).filter_by(status='free').count()} вільно, "
              f"{session.query(ParkingSpot).filter_by(status='occupied').count()} зайнято, "
              f"{session.query(ParkingSpot).filter_by(status='reserved').count()} заброньовано.")
        print(f"Активних бронювань: {session.query(Reservation).count()}")
        print(f"Активних талонів: {session.query(TicketSession).filter_by(is_active=True).count()}")
        print(f"Інцидентів у журналі: {session.query(ViolationLog).count()}")
        print("=" * 60)

    except Exception as e:
        session.rollback()
        print(f"[ПОМИЛКА] Помилка заповнення бази: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_database()
