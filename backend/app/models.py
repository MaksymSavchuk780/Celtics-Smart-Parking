"""Database model for the physical spaces on the parking map."""

from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, Column, DateTime, Float, Integer, String, UniqueConstraint

try:
    from backend.app.database import Base
except ImportError:
    from app.database import Base


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class ParkingSpot(Base):
    __tablename__ = "parking_spots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    spot_code = Column(String(10), nullable=False, index=True)
    floor = Column(Integer, nullable=False, index=True)
    sector = Column(String(5), nullable=False)
    status = Column(String(20), nullable=False, default="free")
    x_coord = Column(Float, nullable=False)
    y_coord = Column(Float, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=True)

    __table_args__ = (
        CheckConstraint("status IN ('free', 'occupied')", name="check_parking_spot_status"),
        UniqueConstraint("floor", "spot_code", name="uq_parking_spot_floor_code"),
    )
