// 爱即守护 — ESP32 固件 v3.0
// 功能：读 ASR Pro 语音 → WiFi 传云端

#include <WiFi.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>
#include "config.h"

HardwareSerial asrSerial(2);
String lastText = "";
unsigned long lastAlarmTime = 0;
unsigned long lastUploadTime = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== 爱即守护 v3.0 ===");

  // ASR Pro 串口
  asrSerial.begin(115200, SERIAL_8N1, ASR_RX_PIN, -1);
  Serial.println("[ASR] Ready");

  // WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500); Serial.print("."); tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[WiFi] Failed");
  }
}

void loop() {
  // 读 ASR Pro 文字
  static String buf = "";
  while (asrSerial.available()) {
    char c = asrSerial.read();
    if (c == '\n' || c == '\r') {
      if (buf.length() > 0) {
        lastText = buf;
        Serial.println("[ASR] " + lastText);
        buf = "";

        // 上传到云端
        if (WiFi.status() == WL_CONNECTED) {
          uploadToCloud(lastText);
        }
      }
    } else {
      buf += c;
    }
    if (buf.length() > 100) buf = "";
  }

  // WiFi 断了重连
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastRetry = 0;
    if (millis() - lastRetry > 10000) {
      lastRetry = millis();
      WiFi.reconnect();
    }
  }

  delay(100);
}

void uploadToCloud(String text) {
  HTTPClient http;
  http.begin(CLOUD_FUNC_URL);
  http.addHeader("Content-Type", "application/json");

  bool isSOS = (text.indexOf("救命") >= 0) || (text.indexOf("摔倒") >= 0) ||
               (text.indexOf("救我") >= 0) || (text.indexOf("快来帮我") >= 0);

  String json = "{\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"type\":\"" + String(isSOS ? "voice_sos" : "voice_msg") + "\",";
  json += "\"text\":\"" + text + "\",";
  json += "\"timestamp\":\"" + String(millis()) + "\"}";

  int code = http.POST(json);
  Serial.print("[HTTP] ");
  Serial.println(code == 200 ? "OK" : "FAIL " + String(code));
  http.end();
}
