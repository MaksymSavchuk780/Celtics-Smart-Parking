# Celtics Smart Parking System 🚗🅿️
• Команда «Селтікс»**  
> Гібридна смарт-система навігації, веб-бронювання та аналітики для паркінгу ТЦ

## Запуск через Docker Compose

На Windows встановіть і запустіть Docker Desktop у режимі Linux-контейнерів. Для типового налаштування з WSL 2 виконайте `wsl --install` у PowerShell від імені адміністратора та перезавантажте комп’ютер. Якщо ваша редакція Windows підтримує Hyper-V, Docker Desktop також можна налаштувати з Hyper-V під час встановлення для всіх користувачів. [Інструкція для Windows](https://docs.docker.com/desktop/setup/install/windows-install/)

З кореня проєкту виконайте одну команду:

```powershell
docker compose up --build
```

- Фронтенд: <http://localhost:8443>
- Swagger UI: <http://localhost:8000/docs>

FastAPI використовує SQLite у файлі `/data/parking.db`. Під час першого запуску бекенд створює базу з демоданими, включно з 294 паркомісцями. Дані зберігаються в томі `parking-data` між перезапусками та після `docker compose down`.

---

## 🎯 Суть та мета проєкту
Розробка цілісного концепту, схеми реляційної бази даних, специфікації REST API, Python-симулятора трафіку, апаратного вузла на ESP32 та клікабельного фронтенд-прототипу.

Головна ідея: поєднання зовнішньої світлодіодної навігації (в'їзне LED-табло) із миттєвим веб-сервісом за QR-кодом (Zero-App без завантаження додатків) та попереднім бронюванням паркомісць на сайті ТЦ з автоматичним штрафуванням за порушення броні (+500 грн).

---

## 👥 Команда та ролі
* **Савчук Максим** — Backend / Database Engineer (FastAPI, SQLAlchemy, PostgreSQL/SQLite, Swagger, REST API)
* **Чабан Назар** — IoT / Hardware Engineer (ESP32, HC-SR04, RGB LED, прошивка C++/MicroPython, Wokwi)
* **Андрущенко Руслан** — UI/UX / Frontend Engineer (Figma, 2D-карта паркінгу, LED-табло, B2B-
---
