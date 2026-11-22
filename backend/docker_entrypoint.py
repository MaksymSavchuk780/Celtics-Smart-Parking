import os
import subprocess
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

from sqlalchemy.engine import URL

from .app.database import engine


def seed_new_database(database_url: URL) -> None:
    database_path = database_url.database
    if database_url.get_backend_name() != "sqlite" or not database_path or database_path == ":memory:":
        return

    database_file = Path(database_path)
    if database_file.exists():
        return

    with TemporaryDirectory(prefix=".seed-", dir=database_file.parent) as temp_dir:
        seed_file = Path(temp_dir) / database_file.name
        seed_url = database_url.set(database=str(seed_file))
        subprocess.run(
            [sys.executable, "-m", "backend.seed"],
            env={**os.environ, "DATABASE_URL": seed_url.render_as_string()},
            check=True,
        )

        # Publish the complete database atomically without replacing an existing file.
        try:
            os.link(seed_file, database_file)
        except FileExistsError:
            pass


if __name__ == "__main__":
    seed_new_database(engine.url)
    os.execvp(sys.argv[1], sys.argv[1:])
