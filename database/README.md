# Parking database

The MVP stores floor, sector, map coordinates, and the current occupancy of each space in SQLite. A space code is unique within its floor. Each space is either `free` or `occupied`.

- [SQLite schema](schema.sql) for creating the `parking_spots` table.
- [DBML diagram source](schema.dbml) for the same schema.

The backend creates the schema on startup. Docker stores the MVP database in the `parking-mvp-data` volume. Running the backend directly uses `parking-mvp.db` in the repository root by default.
