# Розпіновка (Pinout) та список деталей (BOM)

Плата: ESP32 DevKit (2 паркомісця: `A-01`, `A-02`). RGB LED — із загальним катодом.

| Місце | Елемент | Пін ESP32 |
|-------|---------|-----------|
| A-01 | HC-SR04 TRIG | GPIO5 |
| A-01 | HC-SR04 ECHO | GPIO18 (через дільник 5V → 3.3V) |
| A-01 | RGB LED R / G / B | GPIO25 / GPIO26 / GPIO27 (через 220 Ом) |
| A-02 | HC-SR04 TRIG | GPIO19 |
| A-02 | HC-SR04 ECHO | GPIO21 (через дільник 5V → 3.3V) |
| A-02 | RGB LED R / G / B | GPIO32 / GPIO33 / GPIO14 (через 220 Ом) |

HC-SR04 живиться від 5V (VIN), GND — спільний. ECHO видає 5V, тому потрібен дільник (1 кОм + 2 кОм).

## BOM

| Деталь | К-сть |
|--------|-------|
| ESP32 DevKit | 1 |
| HC-SR04 | 2 |
| RGB LED (загальний катод) | 2 |
| Резистор 220 Ом | 6 |
| Резистори 1 кОм / 2 кОм (дільник ECHO) | 2 / 2 |

## Логіка

Кожні 1000 мс: `відстань = час_повернення_імпульсу × 0.0343 / 2` (см). Якщо відстань < 10 см — LED червоний,
`is_occupied = true`, інакше зелений. Для кожного місця надсилається `POST` JSON на `BACKEND_URL`
(формат — `contracts/sensor_telemetry_contract.json`, заголовок `X-Device-Token`).

## Збірка

Скопіюйте `config.h.example` → `config.h`, вкажіть Wi-Fi та URL бекенду, відкрийте `esp32_firmware.ino` в Arduino IDE
(плата "ESP32 Dev Module", бібліотеки `WiFi` і `HTTPClient` входять до ESP32 core).
