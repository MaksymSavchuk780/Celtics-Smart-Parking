# Celtics Smart Parking System

Celtics Smart Parking System helps drivers find free spaces in commercial parking facilities such as shopping center garages. Sensors report when spaces are occupied, and a floor-by-floor map shows which spaces are free, occupied, or reserved.

Drivers can reserve a space online or check the entrance LED display. The dashboard shows how full the garage is.

## Tech stack

| Component | How it works |
| --- | --- |
| Frontend | React and TypeScript power the map, booking form, and dashboard. Vite builds the web app. |
| Backend | Python and FastAPI handle sensor updates and bookings. Swagger UI documents the REST API. |
| Database | SQLite stores space status, reservations, and parking sessions. The backend uses SQLAlchemy to read and write records. [Database schema](database/README.md) |
| Hardware | An ESP32 runs C++ firmware that reads HC-SR04 distance sensors, controls RGB LEDs, and sends occupancy updates to the API. [Wiring guide](hardware/docs/pinout.md) |
| Containers | Docker Compose builds and starts both services. Nginx serves the frontend and forwards `/api/` requests to FastAPI. |

## Run locally

### Prerequisites

- Git to clone the repository. [Install Git](https://git-scm.com/install/)
- On Windows or macOS, install and start Docker Desktop. Use Linux containers on Windows. [Windows setup](https://docs.docker.com/desktop/setup/install/windows-install/) · [macOS setup](https://docs.docker.com/desktop/setup/install/mac-install/)
- On Linux, use Docker Engine with the Docker Compose plugin. [Install the Compose plugin](https://docs.docker.com/compose/install/linux/)

If you plan to use Docker Desktop with WSL 2 and still need to set up WSL, run `wsl --install` in an elevated PowerShell window, then restart your computer. [Microsoft WSL setup guide](https://learn.microsoft.com/en-us/windows/wsl/install)

The Docker images provide Python and Node.js and install the project dependencies during the build.

### Clone and start

Clone the branch that contains the Compose configuration and start the project from the repository root.

```sh
git clone --branch feature/docker-compose https://github.com/MaksymSavchuk780/Celtics-Smart-Parking.git
cd Celtics-Smart-Parking
docker compose up --build -d --wait
```

- [Parking map](http://localhost:8443/?view=map)
- [Swagger UI](http://localhost:8000/docs)

On first startup, the backend creates a SQLite database with 294 demo parking spaces across three floors. You can try the map and book a space without connecting any sensors.

To stop the project, run `docker compose down` from the same directory. SQLite data stays in the `parking-data` Docker volume.

## Team

- **Maksym Savchuk** — backend and database
- **Nazar Chaban** — sensors and ESP32 firmware
- **Ruslan Andrushchenko** — design and frontend
