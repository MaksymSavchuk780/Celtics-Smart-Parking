-- ============================================================
-- Celtics Smart Parking System — SQL DDL Migration Schema
-- Compatible with PostgreSQL & SQLite
-- Author: Савчук (Backend / Database Engineer)
-- ============================================================

-- 1. Таблиця фізичних паркомісць
CREATE TABLE IF NOT EXISTS parking_spots (
    id SERIAL PRIMARY KEY,
    spot_code VARCHAR(10) NOT NULL UNIQUE,
    floor INTEGER NOT NULL,
    sector VARCHAR(5) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'reserved')),
    x_coord DECIMAL(8,2) NOT NULL,
    y_coord DECIMAL(8,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL
);

-- 2. Таблиця паркувальних сесій та талонів
CREATE TABLE IF NOT EXISTS tickets_sessions (
    id SERIAL PRIMARY KEY,
    ticket_uid VARCHAR(30) NOT NULL UNIQUE,
    plate_number VARCHAR(15) NOT NULL,
    entry_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    spot_id INTEGER NULL REFERENCES parking_spots(id) ON DELETE SET NULL,
    fine_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    exit_time TIMESTAMP NULL
);

-- 3. Таблиця попередніх веб-бронювань
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    plate_number VARCHAR(15) NOT NULL,
    spot_id INTEGER NOT NULL REFERENCES parking_spots(id) ON DELETE CASCADE,
    reserved_from TIMESTAMP NOT NULL,
    reserved_until TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'violated')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Журнал інцидентів порушень та нарахування штрафів
CREATE TABLE IF NOT EXISTS violations_log (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NULL REFERENCES tickets_sessions(id) ON DELETE SET NULL,
    spot_id INTEGER NOT NULL REFERENCES parking_spots(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fine_reason VARCHAR(255) NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE
);

-- ------------------------------------------------------------
-- ІНДЕКСИ ДЛЯ ШВИДКОДІЇ (ANPR пошук, Live-карта та алерти):
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_parking_spots_floor_status ON parking_spots(floor, status);
CREATE INDEX IF NOT EXISTS idx_parking_spots_spot_code ON parking_spots(spot_code);
CREATE INDEX IF NOT EXISTS idx_tickets_sessions_plate ON tickets_sessions(plate_number);
CREATE INDEX IF NOT EXISTS idx_tickets_sessions_active ON tickets_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_reservations_spot_status ON reservations(spot_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_plate ON reservations(plate_number);
CREATE INDEX IF NOT EXISTS idx_violations_log_spot ON violations_log(spot_id);
CREATE INDEX IF NOT EXISTS idx_violations_log_ticket ON violations_log(ticket_id);
