# ⚡ Celtics Parking System — Hardware (ESP32 Node)

Розробник: **Чабан** (IoT / Hardware Engineer)

## 📦 Що лежить у цій папці:
* [`esp32_firmware.ino`](esp32_firmware.ino) — готовий C++ скетч для прошивки плати в Arduino IDE.
* [`wokwi/diagram.json`](wokwi/diagram.json) — схема для запуску у безкоштовному веб-симуляторі [Wokwi.com](https://wokwi.com).
* [`docs/pinout.md`](docs/pinout.md) — розпіновка ніжок GPIO та список деталей для фізичної збірки.

## 🛠️ Як прошити плату через Arduino IDE:
1. Встановіть [Arduino IDE](https://www.arduino.cc/en/software).
2. Додайте підтримку плат ESP32: **File ➔ Preferences ➔ Additional Boards Manager URLs**:
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Встановіть бібліотеку **ArduinoJson** (версія 6.x або 7.x): **Tools ➔ Manage Libraries ➔ пошук `ArduinoJson`**.
4. Відкрийте файл `esp32_firmware.ino`:
   * Вкажіть ім'я та пароль своєї Wi-Fi мережі (`ssid`, `password`).
   * Вкажіть локальну IP-адресу комп'ютера Савчука (`serverUrl`).
5. Натисніть **Upload** (стрілочка праворуч) і відкрийте **Serial Monitor** на швидкості `115200`.

## 🌐 Як запустити в онлайн-емуляторі Wokwi:
1. Зайдіть на [wokwi.com/esp32](https://wokwi.com/esp32).
2. Завантажте файл `wokwi/diagram.json` та код `esp32_firmware.ino`.
3. Ви зможете повзунком рухати відстань до перешкоди та спостерігати зміну кольорів діода!
