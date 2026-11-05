# Celtics Smart Parking System 🚗🅿️

> **Академічний проєкт (Proof of Concept) • Команда «Селтікс»**  
> Гібридна смарт-система навігації, веб-бронювання та аналітики для паркінгу ТЦ

---

## 🎯 Суть та мета проєкту
Розробка цілісного концепту, схеми реляційної бази даних, специфікації REST API, Python-симулятора трафіку, апаратного вузла на ESP32 та клікабельного фронтенд-прототипу для захисту перед комісією.

Головна ідея: поєднання зовнішньої світлодіодної навігації (в'їзне LED-табло) із миттєвим веб-сервісом за QR-кодом (Zero-App без завантаження додатків) та попереднім бронюванням паркомісць на сайті ТЦ з автоматичним штрафуванням за порушення броні (+500 грн).

---

## 👥 Команда та ролі
* **Савчук** — Backend / Database Engineer (FastAPI, SQLAlchemy, PostgreSQL/SQLite, Swagger, REST API)
* **Чабан** — IoT / Hardware Engineer (ESP32, HC-SR04, RGB LED, прошивка C++/MicroPython, Wokwi)
* **Андрущенко** — UI/UX / Frontend Engineer (Figma, 2D-карта паркінгу, LED-табло, B2B-дашборд)

---

## 🏗️ Структура проєкту
```text
├── celtics_parking/                      # Python бекенд та прошивка IoT
│   ├── schemas.py                        # Pydantic v2 схеми та DTO для FastAPI
│   └── esp32_firmware_snippet.ino        # C++ скетч для мікроконтролера ESP32
├── contracts/                            # Узгоджені JSON-контракти системи
│   ├── parking_spot_contract.json        # Контракт об'єкта паркомісця (FastAPI <-> Web 2D-карта)
│   └── sensor_telemetry_contract.json    # Пакет телеметрії (ESP32 -> FastAPI)
├── schema.dbml                           # ER-діаграма для сервісу dbdiagram.io (4 таблиці)
├── schema.sql                            # SQL DDL схема (PostgreSQL / SQLite) з індексами
├── Celtics_Smart_Parking_System_Tasks.xlsx # Інтерактивний беклог та шаблон управління проєктом
├── requirements.txt                      # Залежності Python (FastAPI, SQLAlchemy, Pydantic)
└── README.md
```

---

## 🗄️ База даних (4 пов'язані таблиці)
1. `parking_spots` — реєстр паркомісць із координатами для 2D-карти та статусами (`free`, `occupied`, `reserved`).
2. `tickets_sessions` — облік заїздів через ANPR, паркувальних талонів та нарахованих штрафів.
3. `reservations` — онлайн-бронювання місць клієнтами із сайту ТЦ.
4. `violations_log` — журнал аудит-логів несанкціонованого паркування на чужій броні.

---

## 🚀 Швидкий старт для бекенду
```bash
pip install -r requirements.txt
```
