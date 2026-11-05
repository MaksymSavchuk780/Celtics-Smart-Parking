# -*- coding: utf-8 -*-
"""
Celtics Smart Parking System — Ukrainian License Plate & Traffic Generator
US 3.5: Генератор потоку номерів авто та сигналів датчиків для тестування без заліза
"""

import random

# Серії регіонів України
REGIONS = ["BC", "AA", "KA", "AE", "BH", "AM", "AX", "BO", "BX"]
LETTERS = ["AB", "CX", "OO", "TT", "EM", "HK", "IA", "KP"]

def generate_ukrainian_plate() -> str:
    """Генерує валідний держномер формату BC 1234 AB"""
    reg = random.choice(REGIONS)
    num = f"{random.randint(1000, 9999)}"
    suffix = random.choice(LETTERS)
    return f"{reg} {num} {suffix}"

def generate_ticket_id() -> str:
    """Генерує номер талона формату TCK-8041"""
    return f"TCK-{random.randint(1000, 9999)}"

if __name__ == "__main__":
    print("Згенеровані тестові номери:")
    for _ in range(5):
        print(f"Талон: {generate_ticket_id()} | Авто: {generate_ukrainian_plate()}")
