#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <WiFi.h>
#include "config.h"

unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 10000;  // 10秒重试一次

// ==================== 连接 WiFi ====================
bool connectWiFi() {
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("[WiFi] Connected! IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] RSSI: ");
    Serial.println(WiFi.RSSI());
    return true;
  } else {
    Serial.println();
    Serial.println("[WiFi] Connection failed");
    return false;
  }
}

// ==================== 检查并维持连接 ====================
bool ensureWiFiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  // 每隔 reconnectInterval 尝试重连
  unsigned long now = millis();
  if (now - lastReconnectAttempt > reconnectInterval) {
    lastReconnectAttempt = now;
    Serial.println("[WiFi] Reconnecting...");
    return connectWiFi();
  }
  return false;
}

#endif
