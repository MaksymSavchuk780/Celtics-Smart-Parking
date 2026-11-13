// Прошивка ESP32: 2 ультразвукові датчики HC-SR04 + 2 RGB LED (2 паркомісця).
// Кожні 1000 мс: вимір відстані -> відстань < 10 см = зайнято (червоний), інакше вільно (зелений)
// -> HTTP POST JSON на бекенд (див. contracts/sensor_telemetry_contract.json).
#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>
#include "config.h"

const uint32_t MEASURE_INTERVAL_MS = 1000;
const float DETECTION_THRESHOLD_CM = 10.0;
const float MAX_DISTANCE_CM = 400.0;
const float SOUND_SPEED_CM_PER_US = 0.0343;   // 343 м/с
const unsigned long ECHO_TIMEOUT_US = 25000;  // ~4 м туди й назад
const uint16_t HTTP_TIMEOUT_MS = 400;         // 2 запити за цикл мають вкластися в 1000 мс

struct ParkingSpot {
  const char* spotCode;
  uint8_t trigPin;
  uint8_t echoPin;
  uint8_t redPin;
  uint8_t greenPin;
  uint8_t bluePin;
};

ParkingSpot spots[] = {
  {"A-01", 5, 18, 25, 26, 27},
  {"A-02", 19, 21, 32, 33, 14},
};
const size_t SPOT_COUNT = sizeof(spots) / sizeof(spots[0]);

uint32_t lastMeasureMs = 0;

// Відстань = (час повернення імпульсу * швидкість звуку) / 2. Повертає MAX_DISTANCE_CM, якщо ехо немає.
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

void setLed(const ParkingSpot& s, bool occupied) {
  digitalWrite(s.redPin, occupied ? HIGH : LOW);
  digitalWrite(s.greenPin, occupied ? LOW : HIGH);
  digitalWrite(s.bluePin, LOW);
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Wi-Fi connecting");
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
    delay(250);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nWi-Fi OK, IP: %s\n", WiFi.localIP().toString().c_str());
    configTime(0, 0, "pool.ntp.org", "time.google.com");
  } else {
    Serial.println("\nWi-Fi unavailable, will retry");
  }
}

bool sendStatus(const ParkingSpot& s, float distanceCm, bool occupied) {
  if (WiFi.status() != WL_CONNECTED) return false;

  char body[320];
  snprintf(body, sizeof(body),
           "{\"device_id\":\"%s\",\"spot_code\":\"%s\",\"distance_cm\":%.1f,"
           "\"detection_threshold_cm\":%.1f,\"raw_state\":%d,\"is_occupied\":%s,"
           "\"uptime_sec\":%lu,\"timestamp\":%lu}",
           DEVICE_ID, s.spotCode, distanceCm, DETECTION_THRESHOLD_CM,
           occupied ? 1 : 0, occupied ? "true" : "false",
           (unsigned long)(millis() / 1000), (unsigned long)time(nullptr));

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  int code = http.POST(body);
  http.end();

  Serial.printf("[%s] %.1f cm -> %s | POST %d\n", s.spotCode, distanceCm,
                occupied ? "OCCUPIED (red)" : "FREE (green)", code);
  return code >= 200 && code < 300;
}

void setup() {
  Serial.begin(115200);
  for (size_t i = 0; i < SPOT_COUNT; i++) {
    pinMode(spots[i].trigPin, OUTPUT);
    pinMode(spots[i].echoPin, INPUT);
    pinMode(spots[i].redPin, OUTPUT);
    pinMode(spots[i].greenPin, OUTPUT);
    pinMode(spots[i].bluePin, OUTPUT);
    setLed(spots[i], false);
  }
  connectWifi();
  lastMeasureMs = millis();
}

void loop() {
  if (millis() - lastMeasureMs < MEASURE_INTERVAL_MS) return;
  lastMeasureMs = millis();

  connectWifi();

  for (size_t i = 0; i < SPOT_COUNT; i++) {
    float distance = measureDistanceCm(spots[i]);
    bool occupied = distance < DETECTION_THRESHOLD_CM;
    setLed(spots[i], occupied);  // LED перемикається локально, незалежно від мережі
    sendStatus(spots[i], distance, occupied);
  }
}
