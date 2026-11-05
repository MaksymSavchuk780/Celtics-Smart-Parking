# -*- coding: utf-8 -*-
"""
Celtics Smart Parking System — SQLAlchemy ORM Models
Tables: parking_spots, tickets_sessions, reservations, violations_log
Author: Савчук (Backend / Database Engineer)
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class ParkingSpot(Base):
    __tablename__ = "parking_spots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    spot_code = Column(String(10), unique=True, nullable=False, index=True)
    floor = Column(Integer, nullable=False, index=True)
    sector = Column(String(5), nullable=False)
    status = Column(String(20), nullable=False, default="free")  # free, occupied, reserved
    x_coord = Column(Float, nullable=False)
    y_coord = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sessions = relationship("TicketSession", back_populates="spot")
    reservations = relationship("Reservation", back_populates="spot")
    violations = relationship("ViolationLog", back_populates="spot")


class TicketSession(Base):
    __tablename__ = "tickets_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_uid = Column(String(30), unique=True, nullable=False, index=True)
    plate_number = Column(String(15), nullable=False, index=True)
    entry_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    spot_id = Column(Integer, ForeignKey("parking_spots.id", ondelete="SET NULL"), nullable=True)
    fine_amount = Column(Float, default=0.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    exit_time = Column(DateTime, nullable=True)

    # Relationships
    spot = relationship("ParkingSpot", back_populates="sessions")
    violations = relationship("ViolationLog", back_populates="ticket")


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    plate_number = Column(String(15), nullable=False, index=True)
    spot_id = Column(Integer, ForeignKey("parking_spots.id", ondelete="CASCADE"), nullable=False, index=True)
    reserved_from = Column(DateTime, nullable=False)
    reserved_until = Column(DateTime, nullable=False)
    status = Column(String(20), default="active", nullable=False)  # pending, active, completed, cancelled, violated
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    spot = relationship("ParkingSpot", back_populates="reservations")


class ViolationLog(Base):
    __tablename__ = "violations_log"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(Integer, ForeignKey("tickets_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    spot_id = Column(Integer, ForeignKey("parking_spots.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    fine_reason = Column(String(255), nullable=False)
    resolved = Column(Boolean, default=False, nullable=False)

    # Relationships
    ticket = relationship("TicketSession", back_populates="violations")
    spot = relationship("ParkingSpot", back_populates="violations")
