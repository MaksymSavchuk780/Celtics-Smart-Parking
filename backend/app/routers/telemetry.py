# -*- coding: utf-8 -*-
"""
Роутер телеметрії датчиків ESP32: POST /api/v1/telemetry/sensor-event
"""
from flask import Blueprint, jsonify, request

# TODO (Савчук): Прийом телеметрії датчиків, оновлення статусу та зворотне керування LED (blink_red)
telemetry_bp = Blueprint("telemetry", __name__, url_prefix="/api/v1/telemetry")
