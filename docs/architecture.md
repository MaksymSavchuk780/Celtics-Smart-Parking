# Parking availability MVP

The ESP32 reads HC-SR04 distance sensors and posts occupancy updates to `POST /api/v1/telemetry/sensor-event`. The backend updates the corresponding space in SQLite and returns its LED color. Green means a space is free and red means it is occupied. [Wiring guide](../hardware/docs/pinout.md)

`GET /api/v1/map` returns garage and floor totals plus each space’s coordinates and status. The optional floor and sector filters narrow the space list. All three web views use this endpoint.

- `?view=map` shows free and occupied spaces by level and guides drivers to a free space or the lifts.
- `?view=led` shows the entrance display with free space counts or `FULL`. The demo controls simulate arrivals and departures through the telemetry API.
- `?view=dashboard` compares occupancy across levels, shows sensor events, and exports a CSV report.

[Database schema](../database/README.md) · [API contracts](../contracts/README.md)
