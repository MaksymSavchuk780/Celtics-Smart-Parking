# Parking availability MVP

The ESP32 reads HC-SR04 distance sensors and posts occupancy updates to `POST /api/v1/telemetry/sensor-event`. The backend updates the corresponding space in SQLite and returns its LED color. Green means a space is free and red means it is occupied. [Wiring guide](../hardware/docs/pinout.md)

`GET /api/v1/map` returns garage and floor totals plus each space’s coordinates and status. The optional floor and sector filters narrow the space list. All three web views use this endpoint.

- `?view=map` shows free and occupied spaces by level and sector.
- `?view=led` shows the entrance display with free space counts or `FULL`.
- `?view=dashboard` compares occupancy across levels and provides a sensor demo for local testing.

[Database schema](../database/README.md) · [API contracts](../contracts/README.md)
