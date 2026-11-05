# ⚙️ Celtics Parking System — Backend (FastAPI)

Розробник: **Савчук** (Backend / Database Engineer)

## 🚀 Як запустити сервер
1. Встановіть залежності:
   ```bash
   pip install -r requirements.txt
   ```
2. Згенеруйте тестову базу даних (50 паркомісць):
   ```bash
   python seed.py
   ```
3. Запустіть FastAPI сервер:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
4. Відкрийте інтерактивну документацію Swagger у браузері:
   👉 **`http://127.0.0.1:8000/docs`**

## 📡 Основні Ендпоінти:
* `GET /api/v1/map` — Отримання всіх 50 паркомісць з кольорами для 2D-карти Андрущенка.
* `POST /api/v1/reservations` — Бронювання слота за номером авто (перемикає слот на статус reserved).
* `POST /api/v1/telemetry/sensor-event` — Прийом телеметрії від плати ESP32 Чабана (перевірка броні, нарахування штрафу +500 грн при порушенні).
