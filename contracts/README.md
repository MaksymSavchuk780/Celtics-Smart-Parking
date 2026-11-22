# Parking API contracts

- [Parking space](parking_spot_contract.json) describes a space returned by `GET /api/v1/map`, including its coordinates, occupancy, and LED color.
- [Sensor telemetry](sensor_telemetry_contract.json) describes the payload and response for `POST /api/v1/telemetry/sensor-event`. Include the floor when a space code appears on multiple levels.
