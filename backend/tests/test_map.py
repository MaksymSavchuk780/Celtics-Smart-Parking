import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from backend.app import database
from backend.app.main import app
from backend.app.models import ParkingSpot


@pytest.fixture
def api(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    monkeypatch.setattr(database, "engine", engine)

    def get_test_db():
        with Session(engine) as session:
            yield session

    monkeypatch.setitem(app.dependency_overrides, database.get_db, get_test_db)
    with TestClient(app) as client, Session(engine) as session:
        yield client, session
    engine.dispose()


def add_spots(session, *rows):
    for floor, code, status in rows:
        session.add(ParkingSpot(
            spot_code=code,
            floor=floor,
            sector=code[0],
            status=status,
            x_coord=60.0,
            y_coord=100.0,
        ))
    session.commit()


def test_map_counts_and_space_contract(api):
    client, session = api
    add_spots(session, (1, "A-01", "free"), (1, "A-02", "occupied"), (2, "B-01", "free"))

    response = client.get("/api/v1/map")
    assert response.status_code == 200
    data = response.json()
    assert data["summary"] == {
        "total_spots": 3,
        "free_spots": 2,
        "occupied_spots": 1,
        "is_parking_full": False,
        "recommended_sector": "A",
    }
    assert data["floors"] == [
        {"floor": 1, "total_spots": 2, "free_spots": 1, "occupied_spots": 1, "is_full": False},
        {"floor": 2, "total_spots": 1, "free_spots": 1, "occupied_spots": 0, "is_full": False},
    ]
    free, occupied, _ = data["spots"]
    assert set(free) == {"id", "spot_code", "floor", "sector", "status", "coordinates", "led_indicator", "last_telemetry_at"}
    assert free["coordinates"] == {"x": 60.0, "y": 100.0}
    assert free["led_indicator"] == {"color": "green", "hex_color": "#22C55E", "mode": "steady"}
    assert occupied["led_indicator"] == {"color": "red", "hex_color": "#EF4444", "mode": "steady"}


@pytest.mark.parametrize(("query", "codes"), [
    ("floor=1", ["A-01", "B-01"]),
    ("sector=b", ["B-01", "B-02"]),
    ("floor=2&sector=B", ["B-02"]),
    ("floor=99", []),
])
def test_map_filters_only_the_space_list(api, query, codes):
    client, session = api
    add_spots(session, (1, "A-01", "free"), (1, "B-01", "occupied"), (2, "B-02", "free"))
    data = client.get("/api/v1/map/?" + query).json()

    assert [spot["spot_code"] for spot in data["spots"]] == codes
    assert data["summary"]["total_spots"] == 3
    assert [floor["floor"] for floor in data["floors"]] == [1, 2]


def test_full_garage(api):
    client, session = api
    add_spots(session, (1, "A-01", "occupied"), (2, "A-01", "occupied"))
    data = client.get("/api/v1/map").json()

    assert data["summary"]["is_parking_full"]
    assert data["summary"]["free_spots"] == 0
    assert data["summary"]["recommended_sector"] is None
    assert all(floor["is_full"] for floor in data["floors"])


def test_empty_garage(api):
    client, _ = api
    response = client.get("/api/v1/map")

    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["total_spots"] == 0
    assert data["floors"] == data["spots"] == []


def test_openapi_exposes_availability_and_telemetry(api):
    client, _ = api
    paths = client.get("/openapi.json").json()["paths"]
    assert set(paths) == {"/", "/api/v1/map", "/api/v1/telemetry/sensor-event"}
    operation = paths["/api/v1/map"]["get"]
    assert "Map & LED Display" in operation["tags"]
    assert {param["name"] for param in operation["parameters"]} == {"floor", "sector"}


def test_telemetry_updates_the_correct_floor_and_led(api):
    client, session = api
    add_spots(session, (1, "A-01", "free"), (2, "A-01", "free"))
    endpoint = "/api/v1/telemetry/sensor-event"
    payload = {
        "device_id": "ESP32-TEST",
        "spot_code": "a-01",
        "distance_cm": 5.0,
        "raw_state": 1,
        "is_occupied": False,
        "timestamp": 1700000000,
    }

    assert client.post(endpoint, json=payload).status_code == 422
    assert client.post(endpoint, json={**payload, "floor": 99}).status_code == 404
    arrival = client.post(endpoint, json={**payload, "floor": 2})
    assert arrival.status_code == 200
    assert set(arrival.json()) == {"status", "spot_code", "led_color", "message"}
    assert arrival.json()["led_color"] == "red"

    spots = client.get("/api/v1/map").json()["spots"]
    assert [spot["status"] for spot in spots] == ["free", "occupied"]

    departure = client.post(endpoint, json={**payload, "floor": 2, "distance_cm": 100.0, "raw_state": 0})
    assert departure.status_code == 200
    assert departure.json()["led_color"] == "green"
    assert client.get("/api/v1/map").json()["summary"]["free_spots"] == 2


def test_unique_space_code_accepts_telemetry_without_floor(api):
    client, session = api
    add_spots(session, (-1, "B-04", "free"))
    response = client.post("/api/v1/telemetry/sensor-event", json={
        "device_id": "ESP32-TEST",
        "spot_code": "B-04",
        "distance_cm": 8.0,
        "raw_state": 0,
        "is_occupied": True,
        "timestamp": 1700000000,
    })
    assert response.status_code == 200
    assert response.json()["led_color"] == "red"
