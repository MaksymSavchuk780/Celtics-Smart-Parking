import sqlite3
from contextlib import closing
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.engine import URL

from backend.app import database
from backend.docker_entrypoint import seed_new_database


def test_startup_seeds_sqlite_once_and_preserves_user_data(tmp_path):
    database_file = tmp_path / "parking-mvp.db"
    database_url = URL.create("sqlite", database=str(database_file))

    seed_new_database(database_url)
    with closing(sqlite3.connect(database_file)) as connection:
        tables = connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall()
        assert tables == [("parking_spots",)]
        assert connection.execute("SELECT COUNT(*) FROM parking_spots").fetchone() == (294,)
        assert connection.execute("SELECT status, COUNT(*) FROM parking_spots GROUP BY status ORDER BY status").fetchall() == [
            ("free", 289), ("occupied", 5),
        ]
        connection.execute("UPDATE parking_spots SET status = 'occupied' WHERE id = 1")
        connection.commit()

    seed_new_database(database_url)
    with closing(sqlite3.connect(database_file)) as connection:
        assert connection.execute("SELECT status FROM parking_spots WHERE id = 1").fetchone() == ("occupied",)


def test_backend_leaves_the_prototype_database_intact(tmp_path, monkeypatch):
    database_url = URL.create("sqlite", database=str(tmp_path / "parking.db"))
    engine = create_engine(database_url)
    monkeypatch.setattr(database, "engine", engine)
    try:
        with engine.begin() as connection:
            connection.exec_driver_sql("CREATE TABLE reservations (id INTEGER PRIMARY KEY)")
            connection.exec_driver_sql("INSERT INTO reservations (id) VALUES (1)")

        with pytest.raises(RuntimeError, match="separate MVP database"):
            database.init_db()

        with engine.connect() as connection:
            assert connection.exec_driver_sql("SELECT id FROM reservations").scalar_one() == 1
    finally:
        engine.dispose()


def test_sql_schema_allows_the_same_space_code_on_different_floors():
    schema = Path(__file__).resolve().parents[2] / "database" / "schema.sql"
    with closing(sqlite3.connect(":memory:")) as connection:
        connection.executescript(schema.read_text(encoding="utf-8"))
        insert = "INSERT INTO parking_spots (spot_code, floor, sector, status, x_coord, y_coord) VALUES (?, ?, ?, ?, 0, 0)"
        connection.executemany(insert, [("A-01", 1, "A", "free"), ("A-01", 2, "A", "occupied")])

        with pytest.raises(sqlite3.IntegrityError):
            connection.execute(insert, ("A-01", 1, "A", "free"))
        with pytest.raises(sqlite3.IntegrityError):
            connection.execute(insert, ("A-02", 1, "A", "reserved"))
