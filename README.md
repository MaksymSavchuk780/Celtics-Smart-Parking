# Celtics Smart Parking System

Celtics Smart Parking System helps drivers find free spaces in commercial parking facilities such as shopping center garages. Sensors report occupancy, and a floor-by-floor map shows which spaces are free or occupied. The entrance display shows free space counts by level, and the dashboard gives operators a breakdown of occupancy.

## Tech stack

| Component | Technologies |
| --- | --- |
| Web app | React, TypeScript, and Vite for the map, entrance display, and dashboard |
| API | Python and FastAPI for availability and sensor updates, with Swagger UI |
| Database | SQLite and SQLAlchemy for space locations and occupancy. [Database schema](database/README.md) |
| Hardware | ESP32 with C++ firmware, HC-SR04 distance sensors, and red or green LED indicators. [Wiring guide](hardware/docs/pinout.md) |
| Local setup | Docker Compose runs the services. Nginx serves the web app and forwards API requests. |

## Run locally

Install Git and start Docker with Compose. On Windows or macOS, use Docker Desktop. On Linux, use Docker Engine with the Compose plugin. [Git](https://git-scm.com/install/) · [Docker Desktop](https://docs.docker.com/desktop/) · [Compose plugin for Linux](https://docs.docker.com/compose/install/linux/)

On Windows, use Linux containers. To set up the WSL 2 backend, install WSL with `wsl --install` in an elevated PowerShell window and restart your computer. [Microsoft WSL guide](https://learn.microsoft.com/en-us/windows/wsl/install)

```sh
git clone https://github.com/MaksymSavchuk780/Celtics-Smart-Parking.git
cd Celtics-Smart-Parking
```

With the MVP branch checked out, start the services from the repository root.

```sh
docker compose up --build -d --wait
```

- [Home](http://localhost:8443/)
- [Parking map](http://localhost:8443/?view=map)
- [Entrance display](http://localhost:8443/?view=led)
- [Occupancy dashboard](http://localhost:8443/?view=dashboard)
- [Swagger UI](http://localhost:8000/docs)

On first startup, SQLite is seeded with 294 demo spaces across three levels. The map shows the entire selected level. Select a space to see its current status. To simulate an arrival or departure without hardware, use the **−** and **+** buttons on the entrance display.

Run `docker compose down` to stop the services. SQLite data stays in the `parking-mvp-data` volume, which is separate from the original prototype volume.

## Local checks

Install the Python packages in `backend/requirements.txt` and run `python -m pytest -q backend/tests`. For the frontend, run `pnpm --dir frontend install`, then `pnpm --dir frontend exec tsc --noEmit` and `pnpm --dir frontend build`.

## Team

- **Maksym Savchuk** — backend and database
- **Nazar Chaban** — sensors and ESP32 firmware
- **Ruslan Andrushchenko** — design and frontend
