# 📜 Celtics Parking System — API Contracts

Узгоджені міжкомандні JSON-контракти між:
* ⚙️ **Бекендом FastAPI** (Савчук)
* ⚡ **Апаратною платою ESP32** (Чабан)
* 🎨 **Веб-інтерфейсами 2D-карти та табло** (Андрущенко)

## 📁 Файли контрактів:
* [`parking_spot_contract.json`](parking_spot_contract.json) — специфікація об'єкта паркомісця (координати X/Y, статуси `free`/`occupied`/`reserved`, кольори LED).
* [`sensor_telemetry_contract.json`](sensor_telemetry_contract.json) — формат HTTP POST телеметрії від ультразвукового датчика HC-SR04 та зворотна інструкція керування кольором діода.
