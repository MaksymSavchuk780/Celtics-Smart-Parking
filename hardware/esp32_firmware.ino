// Прошивка ESP32: 2 ультразвукові датчики HC-SR04 + 2 RGB LED (2 паркомісця).
// Вимір відстані кожні 1000 мс -> визначення статусу (вільно / зайнято).
// Розумна телеметрія: негайний HTTP POST при зміні стану + periodic heartbeat (10 с).
// Синхронізація з бекендом: підтримка кольорів RGB LED (green, red, blue для броні, blink_red для порушень).
// Неблокуюче підключення Wi-Fi без зависання вимірювань сенсорів.
#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>
#include "config.h"

const uint32_t MEASURE_INTERVAL_MS = 1000;
const uint32_t HEARTBEAT_INTERVAL_MS = 10000;  // Раз на 10 с, якщо стан не змінювався
const float DETECTION_THRESHOLD_CM = 10.0;
const float MAX_DISTANCE_CM = 400.0;
const float SOUND_SPEED_CM_PER_US = 0.0343;   // 343 м/с
const unsigned long ECHO_TIMEOUT_US = 25000;  // ~4 м туди й назад
const uint16_t HTTP_TIMEOUT_MS = 600;         // Таймаут для REST API запиту

enum LedMode {
  LED_GREEN,
  LED_RED,
  LED_BLUE,
  LED_BLINK_RED
};

struct ParkingSpot {
  const char* spotCode;
  uint8_t trigPin;
  uint8_t echoPin;
  uint8_t redPin;
  uint8_t greenPin;
  uint8_t bluePin;

  // Динамічний стан
  bool isOccupied;
  bool lastReportedOccupied;
  bool hasReportedOnce;
  uint32_t lastTelemetryMs;
  LedMode currentLed;
};

ParkingSpot spots[] = {
  {"A-01", 5, 18, 25, 26, 27, false, false, false, 0, LED_GREEN},
  {"A-02", 19, 21, 32, 33, 14, false, false, false, 0, LED_GREEN},
};
const size_t SPOT_COUNT = sizeof(spots) / sizeof(spots[0]);

uint32_t lastMeasureMs = 0;
uint32_t lastBlinkMs = 0;
bool blinkPhase = false;
uint32_t lastWifiAttemptMs = 0;

// Апаратне перемикання кольору RGB-світлодіода
void applyLedPins(const ParkingSpot& s, LedMode mode, bool phase) {
  switch (mode) {
    case LED_GREEN:
      digitalWrite(s.redPin, LOW);
      digitalWrite(s.greenPin, HIGH);
      digitalWrite(s.bluePin, LOW);
      break;
    case LED_RED:
      digitalWrite(s.redPin, HIGH);
      digitalWrite(s.greenPin, LOW);
      digitalWrite(s.bluePin, LOW);
      break;
    case LED_BLUE:
      digitalWrite(s.redPin, LOW);
      digitalWrite(s.greenPin, LOW);
      digitalWrite(s.bluePin, HIGH);
      break;
    case LED_BLINK_RED:
      digitalWrite(s.redPin, phase ? HIGH : LOW);
      digitalWrite(s.greenPin, LOW);
      digitalWrite(s.bluePin, LOW);
      break;
  }
}

// Оновлення фізичного стану світлодіода для місця
void updateLed(ParkingSpot& s) {
  applyLedPins(s, s.currentLed, blinkPhase);
}

// Вимір відстані ультразвуковим датчиком HC-SR04
float measureDistanceCm(const ParkingSpot& s) {
  digitalWrite(s.trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(s.trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(s.trigPin, LOW);

  unsigned long durationUs = pulseIn(s.echoPin, HIGH, ECHO_TIMEOUT_US);
  if (durationUs == 0) return MAX_DISTANCE_CM;

  float distance = durationUs * SOUND_SPEED_CM_PER_US / 2.0;
  return distance > MAX_DISTANCE_CM ? MAX_DISTANCE_CM : distance;
}

// Неблокуюча перевірка та відновлення Wi-Fi зв'язку
void maintainWifi() {
  if (WiFi.status() == WL_CONNECTED) return;

  uint32_t now = millis();
  if (now - lastWifiAttemptMs >= 10000 || lastWifiAttemptMs == 0) {
    lastWifiAttemptMs = now;
    Serial.println("[Wi-Fi] Attempting background reconnection...");
    WiFi.disconnect();
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

// Парсинг кольору світлодіода з відповіді бекенду
LedMode parseLedColorFromResponse(const String& response, bool localOccupied) {
  if (response.indexOf("\"blink_red\"") >= 0) {
    return LED_BLINK_RED;
  } else if (response.indexOf("\"blue\"") >= 0) {
    return LED_BLUE;
  } else if (response.indexOf("\"red\"") >= 0) {
    return LED_RED;
  } else if (response.indexOf("\"green\"") >= 0) {
    return LED_GREEN;
  }
  // Локальний фолбек, якщо поле led_color відсутнє у відповіді
  return localOccupied ? LED_RED : LED_GREEN;
}

// Відправка HTTP POST телеметрії на бекенд
bool sendStatus(ParkingSpot& s, float distanceCm) {
  if (WiFi.status() != WL_CONNECTED) {
    // Якщо немає мережі — локальний фолбек
    s.currentLed = s.isOccupied ? LED_RED : LED_GREEN;
    updateLed(s);
    return false;
  }

  char body[320];
  snprintf(body, sizeof(body),
           "{\"device_id\":\"%s\",\"spot_code\":\"%s\",\"distance_cm\":%.1f,"
           "\"detection_threshold_cm\":%.1f,\"raw_state\":%d,\"is_occupied\":%s,"
           "\"uptime_sec\":%lu,\"timestamp\":%lu}",
           DEVICE_ID, s.spotCode, distanceCm, DETECTION_THRESHOLD_CM,
           s.isOccupied ? 1 : 0, s.isOccupied ? "true" : "false",
           (unsigned long)(millis() / 1000), (unsigned long)time(nullptr));

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);

  int code = http.POST(body);

  if (code >= 200 && code < 300) {
    String response = http.getString();
    http.end();

    // Застосовуємо команду підсвічування від сервера (бронь, тривога, або вільне/зайняте)
    s.currentLed = parseLedColorFromResponse(response, s.isOccupied);
    updateLed(s);

    s.lastReportedOccupied = s.isOccupied;
    s.hasReportedOnce = true;
    s.lastTelemetryMs = millis();

    Serial.printf("[%s] %.1f cm -> %s | Server ACK (%d), LED: %s\n",
                  s.spotCode, distanceCm,
                  s.isOccupied ? "OCCUPIED" : "FREE",
                  code,
                  s.currentLed == LED_BLUE ? "BLUE (RESERVED)" :
                  s.currentLed == LED_BLINK_RED ? "BLINK RED (VIOLATION)" :
                  s.currentLed == LED_RED ? "RED" : "GREEN");
    return true;
  } else {
    http.end();
    // Якщо сервер недоступний — локальне аварійне перемикання
    s.currentLed = s.isOccupied ? LED_RED : LED_GREEN;
    updateLed(s);

    Serial.printf("[%s] %.1f cm -> %s | Server ERR (%d), local fallback\n",
                  s.spotCode, distanceCm,
                  s.isOccupied ? "OCCUPIED" : "FREE", code);
    return false;
  }
}

void setup() {
  Serial.begin(115200);
  for (size_t i = 0; i < SPOT_COUNT; i++) {
    pinMode(spots[i].trigPin, OUTPUT);
    pinMode(spots[i].echoPin, INPUT);
    pinMode(spots[i].redPin, OUTPUT);
    pinMode(spots[i].greenPin, OUTPUT);
    pinMode(spots[i].bluePin, OUTPUT);
    updateLed(spots[i]);
  }

  // Початкова спроба підключення до Wi-Fi (до 5 секунд, без вічного блокування)
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Wi-Fi connecting");
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 5000) {
    delay(200);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nWi-Fi OK, IP: %s\n", WiFi.localIP().toString().c_str());
    configTime(0, 0, "pool.ntp.org", "time.google.com");
  } else {
    Serial.println("\nWi-Fi offline at boot, continuing in standalone mode");
  }

  lastMeasureMs = millis();
}

void loop() {
  maintainWifi();

  // 1. Асинхронне миготіння тривоги (якщо для якогось місця активний режим LED_BLINK_RED)
  uint32_t now = millis();
  if (now - lastBlinkMs >= 400) {
    lastBlinkMs = now;
    blinkPhase = !blinkPhase;
    for (size_t i = 0; i < SPOT_COUNT; i++) {
      if (spots[i].currentLed == LED_BLINK_RED) {
        updateLed(spots[i]);
      }
    }
  }

  // 2. Періодичний вимір датчиками HC-SR04
  if (now - lastMeasureMs < MEASURE_INTERVAL_MS) return;
  lastMeasureMs = now;

  for (size_t i = 0; i < SPOT_COUNT; i++) {
    float distance = measureDistanceCm(spots[i]);
    bool occupied = distance < DETECTION_THRESHOLD_CM;
    spots[i].isOccupied = occupied;

    // Розумний тригер відправки:
    // Відправляємо HTTP POST якщо:
    // a) Стан змінився (авто припаркувалось або поїхало), АБО
    // b) Це перший запуск, АБО
    // c) Минув час періодичного heartbeat (10 секунд)
    bool stateChanged = (occupied != spots[i].lastReportedOccupied);
    bool heartbeatDue = (now - spots[i].lastTelemetryMs >= HEARTBEAT_INTERVAL_MS);

    if (stateChanged || !spots[i].hasReportedOnce || heartbeatDue) {
      sendStatus(spots[i], distance);
    } else {
      // Якщо стан не змінювався і команда не оновлювалась, підтримуємо актуальний LED
      updateLed(spots[i]);
    }
  }
}
