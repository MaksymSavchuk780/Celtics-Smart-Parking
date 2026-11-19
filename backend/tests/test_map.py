# -*- coding: utf-8 -*-
"""
Celtics Smart Parking System — Map & LED Display Router Tests
Автотести для ендпоінта GET /api/v1/map:
1. Валідність структури відповіді та статус 200 OK.
2. Поверхові лічильники при змішаних статусах (free, occupied, reserved).
3. Сценарій FULL (is_full == True та is_parking_full == True при 0 вільних).
4. Відповідність схеми слотів контракту parking_spot_contract.json (числові x, y, led_indicator).
5. Фільтрація слотів за floor та sector.
6. Порожня база даних (0 слотів) без падіння сервера.
7. Документація Swagger/OpenAPI (/openapi.json).
8. Відображення активних сесій, броней та тривоги миготіння (blink_red) при порушеннях.
"""

import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

APP_DIR = Path(__file__).resolve().parent.parent / "app"
BACKEND_DIR = APP_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

for p in (PROJECT_ROOT, BACKEND_DIR, APP_DIR):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.models import ParkingSpot, TicketSession, Reservation, ViolationLog

# Ізольована SQLite БД у пам'яті для тестів (НЕ торкається parking.db)
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_test_db():
    """Створює чисті таблиці перед кожним тестом і видаляє після"""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    """Фікстура прямого доступу до тестової сесії БД"""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    """TestClient із підміною get_db на ізольовану in-memory БД"""
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def seed_sample_parking_spots(session):
    """Допоміжний хелпер: створення тестового набору паркомісць"""
    spots = [
        # Поверх 1: Сектор A (2 free, 1 occupied)
        ParkingSpot(spot_code="A-01", floor=1, sector="A", status="free", x_coord=60.0, y_coord=100.0),
        ParkingSpot(spot_code="A-02", floor=1, sector="A", status="free", x_coord=115.0, y_coord=100.0),
        ParkingSpot(spot_code="A-03", floor=1, sector="A", status="occupied", x_coord=170.0, y_coord=100.0),
        # Поверх 1: Сектор B (1 reserved, 1 free)
        ParkingSpot(spot_code="B-01", floor=1, sector="B", status="reserved", x_coord=60.0, y_coord=220.0),
        ParkingSpot(spot_code="B-02", floor=1, sector="B", status="free", x_coord=115.0, y_coord=220.0),
        # Поверх 2: Сектор A (1 occupied, 1 reserved)
        ParkingSpot(spot_code="A-11", floor=2, sector="A", status="occupied", x_coord=60.0, y_coord=100.0),
        ParkingSpot(spot_code="A-12", floor=2, sector="A", status="reserved", x_coord=115.0, y_coord=100.0),
        # Поверх 2: Сектор C (1 free)
        ParkingSpot(spot_code="C-01", floor=2, sector="C", status="free", x_coord=60.0, y_coord=340.0),
    ]
    session.add_all(spots)
    session.commit()
    return spots


def test_get_map_structure_and_200(client, db_session):
    """Кейс 1: GET /api/v1/map повертає 200 OK і валідну структуру відповіді"""
    seed_sample_parking_spots(db_session)

    response = client.get("/api/v1/map")
    assert response.status_code == 200
    data = response.json()

    assert "summary" in data
    assert "floors" in data
    assert "spots" in data
    assert isinstance(data["summary"], dict)
    assert isinstance(data["floors"], list)
    assert isinstance(data["spots"], list)


def test_floor_counters_mixed_statuses(client, db_session):
    """Кейс 2: Коректний підрахунок лічильників при змішаних статусах"""
    seed_sample_parking_spots(db_session)

    response = client.get("/api/v1/map")
    assert response.status_code == 200
    data = response.json()

    # Загальний звіт: всього 8 слотів (4 free, 2 occupied, 2 reserved)
    summary = data["summary"]
    assert summary["total_spots"] == 8
    assert summary["free_spots"] == 4
    assert summary["occupied_spots"] == 2
    assert summary["reserved_spots"] == 2
    assert summary["is_parking_full"] is False
    # Сектор A має 2 вільних (A-01, A-02), B має 1 (B-02), C має 1 (C-01) -> рек. сектор A
    assert summary["recommended_sector"] == "A"

    # Поверхи: 1 та 2 у порядку зростання
    floors = data["floors"]
    assert len(floors) == 2
    f1, f2 = floors[0], floors[1]

    assert f1["floor"] == 1
    assert f1["total_spots"] == 5
    assert f1["free_spots"] == 3
    assert f1["occupied_spots"] == 1
    assert f1["reserved_spots"] == 1
    assert f1["is_full"] is False

    assert f2["floor"] == 2
    assert f2["total_spots"] == 3
    assert f2["free_spots"] == 1
    assert f2["occupied_spots"] == 1
    assert f2["reserved_spots"] == 1
    assert f2["is_full"] is False


def test_full_parking_scenario(client, db_session):
    """Кейс 3: Сценарій FULL (коли вільних місць 0)"""
    spots = [
        ParkingSpot(spot_code="A-01", floor=1, sector="A", status="occupied", x_coord=60.0, y_coord=100.0),
        ParkingSpot(spot_code="A-02", floor=1, sector="A", status="reserved", x_coord=115.0, y_coord=100.0),
        ParkingSpot(spot_code="B-01", floor=2, sector="B", status="occupied", x_coord=60.0, y_coord=220.0),
    ]
    db_session.add_all(spots)
    db_session.commit()

    response = client.get("/api/v1/map")
    assert response.status_code == 200
    data = response.json()

    summary = data["summary"]
    assert summary["total_spots"] == 3
    assert summary["free_spots"] == 0
    assert summary["is_parking_full"] is True
    assert summary["recommended_sector"] is None

    for floor in data["floors"]:
        assert floor["free_spots"] == 0
        assert floor["is_full"] is True


def test_spot_coordinates_and_contract_adherence(client, db_session):
    """Кейс 4: Кожен об'єкт у spots містить валідні координати (x, y) та відповідає контракту"""
    seed_sample_parking_spots(db_session)

    response = client.get("/api/v1/map")
    assert response.status_code == 200
    spots = response.json()["spots"]

    assert len(spots) == 8
    for s in spots:
        assert "id" in s and isinstance(s["id"], int)
        assert "spot_code" in s and isinstance(s["spot_code"], str)
        assert "floor" in s and isinstance(s["floor"], int)
        assert "sector" in s and isinstance(s["sector"], str)
        assert "status" in s and s["status"] in ("free", "occupied", "reserved")

        # Перевірка вкладеного блоку coordinates
        assert "coordinates" in s and isinstance(s["coordinates"], dict)
        coords = s["coordinates"]
        assert "x" in coords and isinstance(coords["x"], (int, float))
        assert "y" in coords and isinstance(coords["y"], (int, float))

        # Перевірка вкладеного блоку led_indicator
        assert "led_indicator" in s and isinstance(s["led_indicator"], dict)
        led = s["led_indicator"]
        assert led["color"] in ("green", "red", "blue", "blink_red")
        assert led["hex_color"].startswith("#")
        assert led["mode"] in ("steady", "blinking")


def test_filtering_by_floor_and_sector(client, db_session):
    """Кейс 5: Коректна робота фільтрації за query-параметрами floor та sector"""
    seed_sample_parking_spots(db_session)

    # Фільтрація тільки по 1 поверху
    res_f1 = client.get("/api/v1/map?floor=1")
    assert res_f1.status_code == 200
    spots_f1 = res_f1.json()["spots"]
    assert len(spots_f1) == 5
    assert all(s["floor"] == 1 for s in spots_f1)

    # Фільтрація тільки по 2 поверху
    res_f2 = client.get("/api/v1/map?floor=2")
    assert res_f2.status_code == 200
    spots_f2 = res_f2.json()["spots"]
    assert len(spots_f2) == 3
    assert all(s["floor"] == 2 for s in spots_f2)

    # Фільтрація за сектором "A"
    res_sec_a = client.get("/api/v1/map?sector=A")
    assert res_sec_a.status_code == 200
    spots_sec_a = res_sec_a.json()["spots"]
    assert len(spots_sec_a) == 5  # 3 на 1 поверсі + 2 на 2 поверсі
    assert all(s["sector"] == "A" for s in spots_sec_a)

    # Комбінована фільтрація floor=1 & sector=B
    res_combo = client.get("/api/v1/map?floor=1&sector=B")
    assert res_combo.status_code == 200
    spots_combo = res_combo.json()["spots"]
    assert len(spots_combo) == 2
    assert all(s["floor"] == 1 and s["sector"] == "B" for s in spots_combo)

    # Неіснуючий сектор
    res_empty = client.get("/api/v1/map?sector=Z")
    assert res_empty.status_code == 200
    assert len(res_empty.json()["spots"]) == 0


def test_empty_database_returns_200(client):
    """Кейс 6: Порожня БД (0 записів) повертає 200 OK без падіння сервера"""
    response = client.get("/api/v1/map")
    assert response.status_code == 200
    data = response.json()

    summary = data["summary"]
    assert summary["total_spots"] == 0
    assert summary["free_spots"] == 0
    assert summary["occupied_spots"] == 0
    assert summary["reserved_spots"] == 0
    assert summary["is_parking_full"] is True
    assert summary["recommended_sector"] is None

    assert data["floors"] == []
    assert data["spots"] == []


def test_openapi_contains_map_endpoint(client):
    """Кейс 7: GET /openapi.json повертає 200 OK і містить задокументований шлях /api/v1/map"""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()

    paths = schema.get("paths", {})
    assert "/api/v1/map" in paths
    map_op = paths["/api/v1/map"].get("get")
    assert map_op is not None
    assert "Map & LED Display" in map_op.get("tags", [])
    assert "summary" in map_op
    assert "description" in map_op

    # Перевірка наявності query-параметрів у Swagger
    params = {p["name"]: p for p in map_op.get("parameters", [])}
    assert "floor" in params
    assert "sector" in params


def test_active_session_and_reservation_data(client, db_session):
    """Кейс 8: Перевірка коректного наповнення current_session та active_reservation"""
    spot = ParkingSpot(spot_code="A-01", floor=1, sector="A", status="occupied", x_coord=60.0, y_coord=100.0)
    db_session.add(spot)
    db_session.commit()

    # Створюємо активну сесію
    session_obj = TicketSession(
        ticket_uid="TCK-9999",
        plate_number="AA1111AA",
        entry_time=datetime.now(timezone.utc).replace(tzinfo=None),
        spot_id=spot.id,
        is_active=True,
        fine_amount=0.0
    )
    # Створюємо активну бронь
    res_obj = Reservation(
        plate_number="AA1111AA",
        spot_id=spot.id,
        reserved_from=datetime.now(timezone.utc).replace(tzinfo=None),
        reserved_until=(datetime.now(timezone.utc) + timedelta(hours=2)).replace(tzinfo=None),
        status="active"
    )
    db_session.add_all([session_obj, res_obj])
    db_session.commit()

    response = client.get("/api/v1/map?floor=1")
    assert response.status_code == 200
    spots = response.json()["spots"]
    assert len(spots) == 1
    s0 = spots[0]

    assert s0["current_session"] is not None
    assert s0["current_session"]["ticket_uid"] == "TCK-9999"
    assert s0["current_session"]["plate_number"] == "AA1111AA"

    assert s0["active_reservation"] is not None
    assert s0["active_reservation"]["plate_number"] == "AA1111AA"


def test_violation_blink_red_led(client, db_session):
    """Кейс 9: Нерозв'язане порушення активує режим миготіння blink_red для світлодіода"""
    spot = ParkingSpot(spot_code="A-01", floor=1, sector="A", status="occupied", x_coord=60.0, y_coord=100.0)
    db_session.add(spot)
    db_session.commit()

    violation = ViolationLog(
        spot_id=spot.id,
        fine_reason="Несанкціоноване паркування на заброньованому місці",
        resolved=False
    )
    db_session.add(violation)
    db_session.commit()

    response = client.get("/api/v1/map")
    assert response.status_code == 200
    s0 = response.json()["spots"][0]

    assert s0["led_indicator"]["color"] == "blink_red"
    assert s0["led_indicator"]["mode"] == "blinking"
