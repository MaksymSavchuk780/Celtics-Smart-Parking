# -*- coding: utf-8 -*-
"""
Celtics Smart Parking System — Database Seeder Script
Автоматично генерує базу даних SQLite (parking.db) із:
- 50 паркомісцями (поверхи 1 та 2, сектори А, Б, В)
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
        # 2. Генерація 50 паркомісць:
        # Поверх 1: Сектор А (10 слотів), Сектор Б (10 слотів), Сектор В (5 слотів) = 25
        # Поверх 2: Сектор А (10 слотів), Сектор Б (10 слотів), Сектор В (5 слотів) = 25
        # Разом: 50 слотів.
        print("-> Генерація 50 паркомісць на 1 та 2 поверхах (сектори А, Б, В)...")

        spots_dict = {}

        # Розподіл паркомісць
        spot_configs = [
            # Поверх 1
            {"floor": 1, "sector": "A", "start": 1, "count": 10, "prefix": "A", "y": 100.0},
            {"floor": 1, "sector": "B", "start": 1, "count": 10, "prefix": "B", "y": 220.0},
            {"floor": 1, "sector": "C", "start": 1, "count": 5, "prefix": "C", "y": 340.0},
            # Поверх 2
            {"floor": 2, "sector": "A", "start": 11, "count": 10, "prefix": "A", "y": 100.0},
            {"floor": 2, "sector": "B", "start": 11, "count": 10, "prefix": "B", "y": 220.0},
            {"floor": 2, "sector": "C", "start": 6, "count": 5, "prefix": "C", "y": 340.0},
        ]

        # Статуси для демонстрації різних станів
        reserved_spot_codes = {"A-01", "B-04", "C-02"}
        occupied_spot_codes = {"A-05", "B-02", "B-12", "C-08"}

        for cfg in spot_configs:
            floor = cfg["floor"]
            sector = cfg["sector"]
            y = cfg["y"]
            for i in range(cfg["count"]):
                spot_num = cfg["start"] + i
                spot_code = f"{cfg['prefix']}-{spot_num:02d}"
                x = 60.0 + (i * 55.0)  # Координата X з кроком 55px

                # Визначення статусу
                if spot_code in reserved_spot_codes:
                    status = "reserved"
                elif spot_code in occupied_spot_codes:
                    status = "occupied"
                else:
                    status = "free"

                spot = ParkingSpot(
                    spot_code=spot_code,
                    floor=floor,
                    sector=sector,
                    status=status,
                    x_coord=x,
                    y_coord=y
                )
                session.add(spot)
                spots_dict[spot_code] = spot

        session.commit()
        print(f"   [OK] Створено {len(spots_dict)} паркомісць.")

        # 3. Тестові онлайн-бронювання на сайті ТЦ
        print("-> Додавання тестових веб-бронювань...")
        now = utc_now()
        res1 = Reservation(
            plate_number="BC1234AB",
            spot_id=spots_dict["A-01"].id,
            reserved_from=now - timedelta(minutes=10),
            reserved_until=now + timedelta(hours=2),
            status="active"
        )
        res2 = Reservation(
            plate_number="KA7788OO",
            spot_id=spots_dict["B-04"].id,
            reserved_from=now,
            reserved_until=now + timedelta(hours=3),
            status="active"
        )
        res3 = Reservation(
            plate_number="AA5555II",
            spot_id=spots_dict["C-02"].id,
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
            spot_id=spots_dict["A-01"].id,
            entry_time=now - timedelta(minutes=15),
            fine_amount=0.0,
            is_active=True
        )
        # Сесія 2: Порушник, який став на чужу броню та отримав штраф +500 грн
        sess2 = TicketSession(
            ticket_uid="TCK-8049",
            plate_number="KA9911AX",
            spot_id=spots_dict["B-02"].id,
            entry_time=now - timedelta(minutes=45),
            fine_amount=500.0,
            is_active=True
        )
        # Сесія 3: Звичайний водій без броні на вільному місці A-05
        sess3 = TicketSession(
            ticket_uid="TCK-8052",
            plate_number="LV4510CX",
            spot_id=spots_dict["A-05"].id,
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
            spot_id=spots_dict["B-02"].id,
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
