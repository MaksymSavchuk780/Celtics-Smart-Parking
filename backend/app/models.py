# -*- coding: utf-8 -*-
"""
Celtics Smart Parking System — SQLAlchemy ORM Models
Реалізація 4 реляційних таблиць системи:
1. parking_spots — фізичні слоти паркінгу (координати, поверхи, статуси)
2. tickets_sessions — паркувальні сесії, ANPR-номери та видані талони
3. reservations — онлайн-бронювання паркомісць відвідувачами ТЦ
4. violations_log — журнал порушень правил паркування та штрафів (+500 грн)
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    CheckConstraint
)
from sqlalchemy.orm import relationship

try:
    from backend.app.database import Base
except ImportError:
    try:
        from app.database import Base
    except ImportError:
        from database import Base


def utc_now():
    """Повертає UTC datetime без часового поясу для збереження в базі даних"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class ParkingSpot(Base):
    """
    Таблиця 1: Фізичні паркомісця паркінгу ТЦ
    Зберігає поверх, сектор, поточний статус та координати для 2D-карти
    """
    __tablename__ = "parking_spots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    spot_code = Column(String(10), unique=True, nullable=False, index=True, comment='Людиночитаний код місця, напр. "A-01"')
    floor = Column(Integer, nullable=False, index=True, comment="Номер поверху: -1, 1, 2")
    sector = Column(String(5), nullable=False, comment='Сектор паркінгу: "A", "B", "C"')
    status = Column(
        String(20),
        nullable=False,
        default="free",
        comment="Поточний статус: free, occupied, reserved"
    )
    x_coord = Column(Float, nullable=False, comment="X-координата на 2D-карті ТЦ (для SVG/Canvas)")
    y_coord = Column(Float, nullable=False, comment="Y-координата на 2D-карті ТЦ (для SVG/Canvas)")
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=True)

    __table_args__ = (
        CheckConstraint("status IN ('free', 'occupied', 'reserved')", name="check_parking_spot_status"),
    )

    # Зв'язки (Relationships)
    sessions = relationship("TicketSession", back_populates="spot", cascade="all, delete-orphan", passive_deletes=True)
    reservations = relationship("Reservation", back_populates="spot", cascade="all, delete-orphan")
    violations = relationship("ViolationLog", back_populates="spot", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ParkingSpot(id={self.id}, code='{self.spot_code}', floor={self.floor}, sector='{self.sector}', status='{self.status}')>"

    def to_dict(self):
        return {
            "id": self.id,
            "spot_code": self.spot_code,
            "floor": self.floor,
            "sector": self.sector,
            "status": self.status,
            "coordinates": {"x": self.x_coord, "y": self.y_coord},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TicketSession(Base):
    """
    Таблиця 2: Паркувальні сесії та талони
    Облік в'їздів через шлагбаум (ANPR), виданих талонів та штрафів
    """
    __tablename__ = "tickets_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_uid = Column(String(30), unique=True, nullable=False, index=True, comment='Штрихкод/UID талона, напр. "TCK-8041"')
    plate_number = Column(String(15), nullable=False, index=True, comment='Розпізнаний держномер авто, напр. "BC1234AB"')
    entry_time = Column(DateTime, default=utc_now, nullable=False, comment="Час заїзду через шлагбаум")
    spot_id = Column(Integer, ForeignKey("parking_spots.id", ondelete="SET NULL"), nullable=True, index=True)
    fine_amount = Column(Float, default=0.0, nullable=False, comment="Нарахований штраф (напр. +500.0 грн)")
    is_active = Column(Boolean, default=True, nullable=False, index=True, comment="Чи авто ще на паркінгу")
    exit_time = Column(DateTime, nullable=True, comment="Час виїзду")

    # Зв'язки (Relationships)
    spot = relationship("ParkingSpot", back_populates="sessions")
    violations = relationship("ViolationLog", back_populates="ticket")

    def __repr__(self):
        return f"<TicketSession(id={self.id}, ticket='{self.ticket_uid}', plate='{self.plate_number}', active={self.is_active}, fine={self.fine_amount})>"

    def to_dict(self):
        return {
            "id": self.id,
            "ticket_uid": self.ticket_uid,
            "plate_number": self.plate_number,
            "entry_time": self.entry_time.isoformat() if self.entry_time else None,
            "spot_id": self.spot_id,
            "fine_amount": self.fine_amount,
            "is_active": self.is_active,
            "exit_time": self.exit_time.isoformat() if self.exit_time else None,
        }


class Reservation(Base):
    """
    Таблиця 3: Попередні онлайн-бронювання місць на сайті ТЦ
    """
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    plate_number = Column(String(15), nullable=False, index=True, comment='Держномер авто клієнта, напр. "BC1234AB"')
    spot_id = Column(Integer, ForeignKey("parking_spots.id", ondelete="CASCADE"), nullable=False, index=True)
    reserved_from = Column(DateTime, nullable=False, comment="Початок слота стоянки")
    reserved_until = Column(DateTime, nullable=False, comment="Кінець слота стоянки")
    status = Column(
        String(20),
        nullable=False,
        default="active",
        comment="Статус: pending, active, completed, cancelled, violated"
    )
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'active', 'completed', 'cancelled', 'violated')",
            name="check_reservation_status"
        ),
    )

    # Зв'язки (Relationships)
    spot = relationship("ParkingSpot", back_populates="reservations")

    def __repr__(self):
        return f"<Reservation(id={self.id}, plate='{self.plate_number}', spot_id={self.spot_id}, status='{self.status}')>"

    def to_dict(self):
        return {
            "id": self.id,
            "plate_number": self.plate_number,
            "spot_id": self.spot_id,
            "reserved_from": self.reserved_from.isoformat() if self.reserved_from else None,
            "reserved_until": self.reserved_until.isoformat() if self.reserved_until else None,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ViolationLog(Base):
    """
    Таблиця 4: Журнал порушень та нарахування штрафів
    Фіксує інциденти несанкціонованого паркування (чуже авто на броні)
    """
    __tablename__ = "violations_log"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(Integer, ForeignKey("tickets_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    spot_id = Column(Integer, ForeignKey("parking_spots.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False, comment="Час фіксації датчиком")
    fine_reason = Column(String(255), nullable=False, comment="Опис порушення")
    resolved = Column(Boolean, default=False, nullable=False, comment="Чи оброблено диспетчером")

    # Зв'язки (Relationships)
    ticket = relationship("TicketSession", back_populates="violations")
    spot = relationship("ParkingSpot", back_populates="violations")

    def __repr__(self):
        return f"<ViolationLog(id={self.id}, spot_id={self.spot_id}, ticket_id={self.ticket_id}, reason='{self.fine_reason}')>"

    def to_dict(self):
        return {
            "id": self.id,
            "ticket_id": self.ticket_id,
            "spot_id": self.spot_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "fine_reason": self.fine_reason,
            "resolved": self.resolved,
        }
