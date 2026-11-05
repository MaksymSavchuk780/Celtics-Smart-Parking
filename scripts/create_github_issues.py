# -*- coding: utf-8 -*-
"""
Celtics Smart Parking System — GitHub Issues & Milestones Generator
Populates repository MaksymSavchuk780/Celtics-Smart-Parking with structured tasks
"""

import urllib.request
import json
import subprocess
import time

def get_git_token():
    p = subprocess.Popen(
        ["git", "credential", "fill"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    stdout, _ = p.communicate(input="protocol=https\nhost=github.com\n")
    for line in stdout.splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1]
    return None

token = get_git_token()
repo = "MaksymSavchuk780/Celtics-Smart-Parking"
headers = {
    "Authorization": f"token {token}",
    "User-Agent": "Celtics-App",
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json"
}

def api_call(url, data=None, method="GET"):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8") if data else None,
        headers=headers,
        method=method
    )
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        # Ignore 422 if already exists
        if "already_exists" in err_msg:
            return {"status": "already_exists"}
        print(f"HTTP Error {e.code}: {err_msg}")
        return None
    except Exception as e:
        print("API Error:", e)
        return None

# 1. СТВОРЕННЯ МІТОК (LABELS)
labels = [
    {"name": "backend", "color": "1E3A8A", "description": "Завдання для Савчука (FastAPI, БД)"},
    {"name": "hardware", "color": "D97706", "description": "Завдання для Чабана (ESP32, Датчики)"},
    {"name": "frontend", "color": "059669", "description": "Завдання для Андрущенка (UI/UX, Карта)"},
    {"name": "epic:1-b2c", "color": "10B981", "description": "Епік 1: B2C Zero-App навігація"},
    {"name": "epic:2-b2b", "color": "F59E0B", "description": "Епік 2: B2B Дашборд директора ТЦ"},
    {"name": "epic:3-dev-core", "color": "6366F1", "description": "Епік 3: Dev/Core Ядро та симуляція"},
    {"name": "status:done", "color": "10B981", "description": "Виконано"},
    {"name": "status:in-progress", "color": "3B82F6", "description": "В процесі"},
    {"name": "status:todo", "color": "6B7280", "description": "До виконання"}
]

print("1. Налаштування міток (Labels)...")
for l in labels:
    url = f"https://api.github.com/repos/{repo}/labels"
    res = api_call(url, l, method="POST")
    if res and res.get("status") == "already_exists":
        # Оновити існуючий лейбл
        api_call(f"{url}/{urllib.parse.quote(l['name'])}", l, method="PATCH")

# 2. СТВОРЕННЯ МАЙЛСТОУНІВ (SPRINTS)
print("2. Налаштування спринтів (Milestones)...")
milestones_data = [
    {"title": "Спринт 1: Архітектура, Схема БД та Стенд ESP32", "due_on": "2026-11-08T23:59:59Z", "description": "Початкове проєктування БД, схемотехніка ESP32 та Figma дизайн"},
    {"title": "Спринт 2: Інтерфейси, REST API та Інтеграція", "due_on": "2026-11-16T23:59:59Z", "description": "Розробка FastAPI ендпоінтів, прошивки ESP32 та верстки 2D-карти"},
    {"title": "Спринт 3: Симулятор трафіку, B2B-дашборд та Фінал PoC", "due_on": "2026-11-26T23:59:59Z", "description": "Штрафування порушників, алерти дашборду, 4 демо-сценарії для захисту"}
]

existing_ms = api_call(f"https://api.github.com/repos/{repo}/milestones?state=all") or []
ms_map = {}
for em in existing_ms:
    ms_map[em["title"]] = em["number"]

for m in milestones_data:
    if m["title"] not in ms_map:
        url = f"https://api.github.com/repos/{repo}/milestones"
        res = api_call(url, m, method="POST")
        if res and "number" in res:
            ms_map[m["title"]] = res["number"]
            print(f"Створено майлстоун '{m['title']}' (#{res['number']})")
    else:
        print(f"Майлстоун '{m['title']}' вже існує (#{ms_map[m['title']]})")

sprint1_num = ms_map.get("Спринт 1: Архітектура, Схема БД та Стенд ESP32", 1)
sprint2_num = ms_map.get("Спринт 2: Інтерфейси, REST API та Інтеграція", 2)
sprint3_num = ms_map.get("Спринт 3: Симулятор трафіку, B2B-дашборд та Фінал PoC", 3)

# 3. СТВОРЕННЯ ISSUES (ЗАВДАНЬ)
issues = [
    {
        "title": "[Савчук] US 3.1: Проєктування реляційної бази даних та узгодження JSON-контракту системи",
        "body": """### 🎯 Завдання Савчука (Backend):
1. Спроєктувати в dbdiagram.io ER-діаграму з 4 таблиць: `parking_spots`, `tickets_sessions`, `reservations`, `violations_log`.
2. Узгодити єдиний JSON-контракт паркомісця та пакет телеметрії датчиків.
3. Описати Pydantic v2 схеми для бекенду.

### ✅ Виконані результати в репозиторії:
- `database/schema.dbml` — сирцевий код схеми для dbdiagram.io
- `database/schema.sql` — готовий SQL DDL скрипт
- `contracts/parking_spot_contract.json` — контракт паркомісця
- `contracts/sensor_telemetry_contract.json` — контракт телеметрії датчиків
- `backend/app/schemas.py` — Pydantic валідація даних""",
        "labels": ["backend", "epic:3-dev-core", "status:done"],
        "milestone": sprint1_num,
        "close": True
    },
    {
        "title": "[Чабан] US 3.5: Проєктування принципової електричної схеми макета паркомісця (ESP32 + HC-SR04 + LED)",
        "body": """### 🎯 Завдання Чабана (Hardware):
1. Розробити в Wokwi / Fritzing схему макета паркомісця (A-01) на базі контролера ESP32.
2. Підключити ультразвуковий датчик відстані HC-SR04 (Trig -> GPIO 5, Echo -> GPIO 18) та RGB LED індикатор через резистори 220 Ом (GPIO 19, 21, 22).
3. Скласти таблицю розпіновки (Pinout) та специфікацію деталей (BOM).

### 📁 Файли для роботи:
- `hardware/wokwi/diagram.json`
- `hardware/docs/pinout.md`""",
        "labels": ["hardware", "epic:3-dev-core", "status:todo"],
        "milestone": sprint1_num,
        "close": False
    },
    {
        "title": "[Андрущенко] US 1.2 + US 1.4: Розробка UI/UX дизайну клієнтських та адміністративних інтерфейсів у Figma",
        "body": """### 🎯 Завдання Андрущенка (UI/UX / Frontend):
1. Створити у Figma дизайн-систему Celtics (фірмова палітра: зелений `#22C55E` - вільно, червоний `#EF4444` - зайнято, синій `#3B82F6` - бронь).
2. Розробити 4 інтерактивні макети:
   - Мобільний екран 2D-карти (Zero-App в браузері смартфону).
   - Віртуальне в'їзне поверхове LED-табло зі статусом «FULL».
   - Форма швидкої броні синього місця на сайті ТЦ.
   - B2B-дашборд директора з моніторингом та журналом порушень.

### 📁 Файли для роботи:
- `frontend/css/style.css`""",
        "labels": ["frontend", "epic:1-b2c", "status:todo"],
        "milestone": sprint1_num,
        "close": False
    },
    {
        "title": "[Савчук] US 3.1: Ініціалізація БД SQLite/PostgreSQL, написання ORM-моделей та скрипту автозаповнення",
        "body": """### 🎯 Завдання Савчука (Backend):
1. Налаштувати конфігурацію підключення до БД (SQLAlchemy async engine) у `backend/app/database.py`.
2. Реалізувати класи моделей SQLAlchemy у `backend/app/models.py` для 4 таблиць згідно зі схемою `schema.sql`.
3. Написати `backend/seed.py`, що автоматично генерує 50 паркомісць на 3 поверхах паркінгу.

### 📁 Файли для роботи:
- `backend/app/models.py`
- `backend/app/database.py`
- `backend/seed.py`""",
        "labels": ["backend", "epic:3-dev-core", "status:todo"],
        "milestone": sprint2_num,
        "close": False
    },
    {
        "title": "[Чабан] US 3.5: Збірка апаратного прототипу на макетній платі та написання прошивки ESP32",
        "body": """### 🎯 Завдання Чабана (Hardware):
1. Зібрати схему паркомісця на безпаєчній макетній платі або протестувати в емуляторі Wokwi.
2. Написати прошивку на C++ у `hardware/esp32_firmware.ino` (Arduino IDE / PlatformIO).
3. Налаштувати таймер замірів 1000 мс (без блокуючих delay).
4. При дистанції < 10 см перемикати RGB LED на червоний та надсилати по Wi-Fi HTTP POST з JSON на бекенд.

### 📁 Файли для роботи:
- `hardware/esp32_firmware.ino`
- `hardware/config.h.example`""",
        "labels": ["hardware", "epic:3-dev-core", "status:todo"],
        "milestone": sprint2_num,
        "close": False
    },
    {
        "title": "[Андрущенко] US 1.1: Верстка віртуального модуля в'їзного поверхового LED-табло зі статусом «FULL»",
        "body": """### 🎯 Завдання Андрущенка (UI/UX / Frontend):
1. Зверстати темний контрастний веб-екран віртуального LED-табло перед в'їздом на паркінг.
2. Вивести лічильники вільних місць окремо по поверхах (-1, 1, 2) та загальну суму.
3. Реалізувати логіку перемикання на статус «МІСЦЬ НЕМАЄ / FULL», якщо лічильник = 0.

### 📁 Файли для роботи:
- `frontend/led_board.html`""",
        "labels": ["frontend", "epic:1-b2c", "status:todo"],
        "milestone": sprint2_num,
        "close": False
    },
    {
        "title": "[Андрущенко] US 1.2: Верстка 2D-карти паркінгу (Zero-App) та навігація «Find My Car»",
        "body": """### 🎯 Завдання Андрущенка (UI/UX / Frontend):
1. Зверстати інтерактивну SVG/Canvas/CSS 2D-карту паркінгу для мобільних пристроїв.
2. Підсвічувати паркомісця кольорами згідно з контрактом: зелений (вільно), червоний (зайнято), синій (бронь).
3. Реалізувати пошук авто за номером талона / авто («Find My Car») з відображенням пішохідного маршруту від виходу ТЦ до машини.

### 📁 Файли для роботи:
- `frontend/index.html`
- `frontend/js/map.js`""",
        "labels": ["frontend", "epic:1-b2c", "status:todo"],
        "milestone": sprint2_num,
        "close": False
    },
    {
        "title": "[Савчук] US 3.2: Центральне REST API зі Swagger-документацією (/docs)",
        "body": """### 🎯 Завдання Савчука (Backend):
1. Реалізувати ендпоінти у FastAPI:
   - `GET /api/v1/map` — віддача стану всіх 50 місць для 2D-карти та LED-табло.
   - `POST /api/v1/reservations` — бронювання місця водієм.
   - `GET /api/v1/reservations/{ticket_id}` — перевірка активної броні.
2. Налаштувати автоматичну інтерактивну Swagger-документацію за адресою `http://localhost:8000/docs`.

### 📁 Файли для роботи:
- `backend/app/routers/map.py`
- `backend/app/routers/reservations.py`""",
        "labels": ["backend", "epic:3-dev-core", "status:todo"],
        "milestone": sprint2_num,
        "close": False
    },
    {
        "title": "[Савчук & Чабан] US 3.3: Синхронізація датчиків ESP32 та автоматичне нарахування штрафу (+500 грн)",
        "body": """### 🎯 Спільне завдання Савчука та Чабана:
1. Реалізувати ендпоінт прийому телеметрії від датчика: `POST /api/v1/telemetry/sensor-event`.
2. Бізнес-логіка виявлення порушників: якщо на синє місце (Reserved) заїжджає автомобіль без права броні -> статус стає `Violated`, автоматично нараховується штраф +500 грн на паркувальний талон!
3. ESP32 отримує зворотну команду у відповіді API та перемикає RGB LED у режим миготіння червоним (`blink_red`).

### 📁 Файли для роботи:
- `backend/app/routers/telemetry.py`
- `hardware/esp32_firmware.ino`""",
        "labels": ["backend", "hardware", "epic:3-dev-core", "status:todo"],
        "milestone": sprint3_num,
        "close": False
    },
    {
        "title": "[Андрущенко] US 2.1 & US 2.5: B2B-дашборд операційного директора ТЦ та журнал штрафів",
        "body": """### 🎯 Завдання Андрущенка (UI/UX / Frontend):
1. Зверстати веб-панель адміністратора (`frontend/dashboard.html`).
2. Графіки та KPI: загальна заповненість паркінгу, середній час стоянки, динаміка прибутку.
3. Live Alert Banner: поява спливаючого сповіщення про несанкціоноване паркування (Violation Alert).
4. Таблиця виписаних штрафів з можливістю фільтрації за номерами та датою.

### 📁 Файли для роботи:
- `frontend/dashboard.html`
- `frontend/js/dashboard.js`""",
        "labels": ["frontend", "epic:2-b2b", "status:todo"],
        "milestone": sprint3_num,
        "close": False
    },
    {
        "title": "[Савчук & Команда] US 3.5 & US 3.6: Python-симулятор трафіку та 4 демо-сценарії для захисту перед комісією",
        "body": """### 🎯 Фінальне командне завдання:
1. Розробити генератор транспортних потоків `simulator/traffic_generator.py` (генерація українських номерів авто `BC 1234 AB`, імітація в'їзду/виїзду через шлагбаум).
2. Реалізувати 4 готові демонстраційні сценарії для захисту диплому/проєкту:
   - Сценарій 1: «Ранковий штиль» (15% місць зайнято).
   - Сценарій 2: «Суботній піковий час» (85% місць зайнято, зелена хвиля навігації).
   - Сценарій 3: «Повний аншлаг 100% FULL» (шлагбаум блокує в'їзд, LED-табло червоне).
   - Сценарій 4: «Порушник на броні» (незаконна парковка -> сирена -> штраф +500 грн у базі та на дашборді).

### 📁 Файли для роботи:
- `simulator/traffic_generator.py`
- `simulator/scenarios.py`""",
        "labels": ["backend", "epic:3-dev-core", "status:todo"],
        "milestone": sprint3_num,
        "close": False
    }
]

print("\n3. Створення Issues...")
existing_issues = api_call(f"https://api.github.com/repos/{repo}/issues?state=all") or []
existing_titles = {i["title"] for i in existing_issues}

for item in issues:
    if item["title"] in existing_titles:
        print(f"Issue вже існує: {item['title'][:40]}...")
        continue
    url = f"https://api.github.com/repos/{repo}/issues"
    data = {
        "title": item["title"],
        "body": item["body"],
        "labels": item["labels"],
        "milestone": item["milestone"]
    }
    created = api_call(url, data, method="POST")
    if created and "number" in created:
        num = created["number"]
        print(f"Створено Issue #{num}: {item['title'][:45]}...")
        if item.get("close"):
            close_url = f"https://api.github.com/repos/{repo}/issues/{num}"
            api_call(close_url, {"state": "closed"}, method="PATCH")
            print(f"  -> Issue #{num} закрито як виконане!")
    time.sleep(0.5)

print("\n==========================================")
print(" Всі завдання успішно синхронізовано з GitHub!")
print("==========================================")
