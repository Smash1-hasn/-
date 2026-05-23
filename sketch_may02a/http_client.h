#ifndef HTTP_CLIENT_H
#define HTTP_CLIENT_H

#include <HTTPClient.h>
#include "config.h"
#include "sensors.h"
#include "fall_detect.h"

unsigned long lastUploadTime = 0;

// ==================== 构建 JSON 数据包 ====================
String buildJsonPayload(SensorData &data) {
  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"acc\":" + String(data.mpu.accG, 2) + ",";
  json += "\"gyroX\":" + String(data.mpu.gx / 16.4, 1) + ",";
  json += "\"gyroY\":" + String(data.mpu.gy / 16.4, 1) + ",";
  json += "\"gyroZ\":" + String(data.mpu.gz / 16.4, 1) + ",";
  json += "\"pitch\":" + String(data.mpu.pitch, 1) + ",";
  json += "\"roll\":" + String(data.mpu.roll, 1) + ",";
  json += "\"fallDetected\":" + String(data.fallDetected ? "true" : "false") + ",";
  json += "\"sosPressed\":" + String(data.sosPressed ? "true" : "false") + ",";
  json += "\"rssi\":" + String(data.rssi);
  json += "}";
  return json;
}

// ==================== 上传数据到云函数 ====================
bool uploadData(SensorData &data) {
  unsigned long now = millis();

  // 正常情况每 DATA_UPLOAD_INTERVAL 上传一次，告警时立即上传
  if (!data.fallDetected && !data.sosPressed &&
      (now - lastUploadTime < DATA_UPLOAD_INTERVAL)) {
    return true;
  }

  lastUploadTime = now;

  HTTPClient http;
  http.begin(CLOUD_FUNC_URL);
  http.addHeader("Content-Type", "application/json");

  String payload = buildJsonPayload(data);

  Serial.print("[HTTP] Uploading data... ");
  int httpCode = http.POST(payload);

  if (httpCode == 200 || httpCode == 201) {
    String response = http.getString();
    Serial.print("OK (");
    Serial.print(httpCode);
    Serial.print(") Response: ");
    Serial.println(response);
    http.end();
    return true;
  } else {
    Serial.print("FAIL (");
    Serial.print(httpCode);
    Serial.print(") ");
    Serial.println(http.errorToString(httpCode));
    http.end();
    return false;
  }
}

// ==================== 上传语音留言 ====================
void sendVoiceMessage(String text) {
  HTTPClient http;
  http.begin(CLOUD_FUNC_URL);
  http.addHeader("Content-Type", "application/json");
  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"type\":\"voice_msg\",";
  json += "\"text\":\"" + text + "\"";
  json += "}";
  int code = http.POST(json);
  Serial.print("[ASR] Voice msg sent: ");
  Serial.println(code == 200 ? "OK" : "FAIL");
  http.end();
}

// ==================== 发送告警到云函数（立即） ====================
bool sendAlert(SensorData &data, String reason) {
  HTTPClient http;
  http.begin(CLOUD_FUNC_URL);
  http.addHeader("Content-Type", "application/json");

  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"type\":\"alert\",";
  json += "\"reason\":\"" + reason + "\",";
  json += "\"fallDetected\":" + String(data.fallDetected ? "true" : "false") + ",";
  json += "\"sosPressed\":" + String(data.sosPressed ? "true" : "false");
  json += "}";

  Serial.print("[HTTP] Sending alert... ");
  int httpCode = http.POST(json);

  if (httpCode == 200 || httpCode == 201) {
    Serial.println("OK");
    http.end();
    return true;
  } else {
    Serial.print("FAIL: ");
    Serial.println(httpCode);
    http.end();
    return false;
  }
}

#endif
