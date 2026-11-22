import sqlite3
from contextlib import closing

from sqlalchemy.engine import URL

from backend.docker_entrypoint import seed_new_database


def test_startup_seeds_sqlite_once_and_preserves_user_data(tmp_path):
    database_file = tmp_path / "parking.db"
    database_url = URL.create("sqlite", database=str(database_file))

    seed_new_database(database_url)
    with closing(sqlite3.connect(database_file)) as database:
        assert database.execute("SELECT COUNT(*) FROM parking_spots").fetchone() == (294,)
        database.execute("UPDATE parking_spots SET status = 'occupied' WHERE id = 1")
        database.commit()

    seed_new_database(database_url)
    with closing(sqlite3.connect(database_file)) as database:
        status = database.execute("SELECT status FROM parking_spots WHERE id = 1").fetchone()
        assert status == ("occupied",)
