# 🏗️ Celtics Smart Parking System — Повна Архітектура Проєкту

## 1. Рівні системи (згідно з концептом команди «Селтікс»)

### 🔌 Рівень 1: Фізичний IoT (Чабан)
* **Апаратний стенд:** ESP32 NodeMCU + Ультразвуковий датчик відстані HC-SR04 + Триколірний RGB LED (220 Ом).
* **Локація коду:** `hardware/esp32_firmware.ino`
* **Схема Wokwi:** `hardware/wokwi/diagram.json`
* **Розпіновка:** `hardware/docs/pinout.md`
* **Зв'язок:** передача замірів методом HTTP POST на `backend/app/routers/telemetry.py`.

### ⚙️ Рівень 2: Ядро системи, БД та REST API (Савчук)
* **Фреймворк:** Python / FastAPI
* **База даних:** 4 реляційні таблиці (`parking_spots`, `tickets_sessions`, `reservations`, `violations_log`).
* **Схема БД:** `database/schema.dbml` (для dbdiagram.io) та `database/schema.sql`.
* **Контракти даних:** `contracts/parking_spot_contract.json` та `contracts/sensor_telemetry_contract.json`.
* **Моделі та DTO:** `backend/app/schemas.py` та `backend/app/models.py`.
* **Роутери:**
  * `map.py` — актуальний стан паркінгу (`GET /api/v1/map`)
  * `reservations.py` — веб-бронювання (`POST /api/v1/reservations`)
  * `telemetry.py` — прийом подій датчика та штрафування (`POST /api/v1/telemetry/sensor-event`)
  * `anpr.py` — в'їзний шлагбаум та камера (`POST /api/v1/anpr/entry`)

### 🎨 Рівень 3: Веб-інтерфейси (Андрущенко)
* **Zero-App 2D-карта водія (US 1.2):** `frontend/index.html` (відкриття за 1 сек за QR-кодом + «Find My Car»).
* **Попереднє веб-бронювання на сайті ТЦ (US 1.5):** `frontend/booking.html`.
* **В'їзне LED-табло зі статусом FULL (US 1.1):** `frontend/led_board.html`.
* **B2B Дашборд директора ТЦ зі штрафами (US 2.1 & 2.5):** `frontend/dashboard.html`.
* **Дизайн-токени та стилі:** `frontend/css/style.css`.

### 🚗 Рівень 4: Симулятор та Демо-сценарії для захисту PoC (US 3.5 & 3.6)
* **Генератор українських номерів авто:** `simulator/traffic_generator.py`.
* **4 демо-сценарії:** `simulator/scenarios.py` (Штиль, Пік, FULL, Порушник на броні).
