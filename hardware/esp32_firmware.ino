/*
 * Celtics Smart Parking System — ESP32 Sensor Node Firmware
 * Hardware: ESP32 NodeMCU + HC-SR04 Ultrasonic + RGB LED
 * Author: Чабан (IoT / Hardware Engineer) & Савчук (Backend)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Wi-Fi Credentials
const char* ssid = "TP-Link_Parking_AP";
const char* password = "smartparking2026";

// Backend API URL
const char* serverUrl = "http://192.168.1.100:8000/api/v1/telemetry/sensor-event";

// Pin Configuration
#define TRIG_PIN 5
#define ECHO_PIN 18
#define LED_RED_PIN 19
#define LED_GREEN_PIN 21
#define LED_BLUE_PIN 22

const char* DEVICE_ID = "ESP32_NODE_A01";
const char* SPOT_CODE = "A-01";
const float DETECTION_THRESHOLD_CM = 10.0;

void setLED(int r, int g, int b) {
  analogWrite(LED_RED_PIN, r);
  analogWrite(LED_GREEN_PIN, g);
  analogWrite(LED_BLUE_PIN, b);
}

float measureDistanceCM() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (duration == 0) return 999.0;
  return (duration * 0.0343) / 2.0;
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_BLUE_PIN, OUTPUT);

  // Default color: Green (Free)
  setLED(0, 255, 0);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi Connected!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    float distance = measureDistanceCM();
    bool isOccupied = (distance < DETECTION_THRESHOLD_CM);
    int rawState = isOccupied ? 1 : 0;

    // Build JSON Payload
    StaticJsonDocument<256> doc;
    doc["device_id"] = DEVICE_ID;
    doc["spot_code"] = SPOT_CODE;
    doc["distance_cm"] = distance;
    doc["raw_state"] = rawState;
    doc["is_occupied"] = isOccupied;
    doc["detection_threshold_cm"] = DETECTION_THRESHOLD_CM;
    doc["timestamp"] = (long)time(NULL);

    String requestBody;
    serializeJson(doc, requestBody);

    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    int httpCode = http.POST(requestBody);
    if (httpCode == HTTP_CODE_OK) {
      String response = http.getString();
      StaticJsonDocument<384> respDoc;
      deserializeJson(respDoc, response);

      const char* ledColor = respDoc["command"]["led_color"];
      int r = respDoc["command"]["rgb_values"]["r"];
      int g = respDoc["command"]["rgb_values"]["g"];
      int b = respDoc["command"]["rgb_values"]["b"];

      setLED(r, g, b);
      Serial.printf("Telemetry sent! Distance: %.1f cm, LED set to %s\n", distance, ledColor);
    } else {
      Serial.printf("HTTP Error: %d\n", httpCode);
    }
    http.end();
  }

  delay(1000); // 1-second telemetry interval
}
