# -*- coding: utf-8 -*-
"""
Роутер шлагбаума та ANPR: POST /api/v1/anpr/entry
"""
from flask import Blueprint, jsonify, request

# TODO (Савчук): Емуляція в'їзду через шлагбаум, генерація талона TCK-XXXX та облік штрафів
anpr_bp = Blueprint("anpr", __name__, url_prefix="/api/v1/anpr")
