# -*- coding: utf-8 -*-
"""
Роутер 2D-карти та табло: GET /api/v1/map
"""
from flask import Blueprint, jsonify, request

# TODO (Савчук): Реалізувати ендпоінт GET /api/v1/map (стан 50 слотів і поверхова статистика)
map_bp = Blueprint("map", __name__, url_prefix="/api/v1/map")
