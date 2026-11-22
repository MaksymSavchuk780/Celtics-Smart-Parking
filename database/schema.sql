-- SQLite schema for the parking availability MVP.
CREATE TABLE IF NOT EXISTS parking_spots (
    id INTEGER PRIMARY KEY,
    spot_code VARCHAR(10) NOT NULL,
    floor INTEGER NOT NULL,
    sector VARCHAR(5) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'free',
    x_coord REAL NOT NULL,
    y_coord REAL NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    CONSTRAINT check_parking_spot_status CHECK (status IN ('free', 'occupied')),
    CONSTRAINT uq_parking_spot_floor_code UNIQUE (floor, spot_code)
);

CREATE INDEX IF NOT EXISTS ix_parking_spots_spot_code ON parking_spots (spot_code);
CREATE INDEX IF NOT EXISTS ix_parking_spots_floor ON parking_spots (floor);
