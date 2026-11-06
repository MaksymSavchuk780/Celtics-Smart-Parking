# -*- coding: utf-8 -*-
"""
Роутер веб-бронювання: POST /api/v1/reservations
"""
from flask import Blueprint, jsonify, request

# TODO (Савчук): Реалізувати ендпоінти створення та перевірки броні
reservations_bp = Blueprint("reservations", __name__, url_prefix="/api/v1/reservations")
