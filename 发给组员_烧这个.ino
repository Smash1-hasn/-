// ESP32 + ASR Pro 语音 → 云端
// 改 WiFi 名和密码，直接上传
// 接线：ASR Pro PB5(TX) → ESP32 GPIO16(RX2)

const char* WIFI_NAME = "你的WiFi名";
const char* WIFI_PASS = "你的WiFi密码";
const char* SERVER = "https://cloud2-d2g7yeednd8ac1836.service.tcloudbase.com/deviceDataIngest";

#include <WiFi.h>
#include <HTTPClient.h>

void setup() {
  Serial.begin(115200);
  Serial2.begin(115200, SERIAL_8N1, 16, 17);
  Serial.println("连接WiFi: " + String(WIFI_NAME));
  WiFi.begin(WIFI_NAME, WIFI_PASS);
  int n = 0;
  while (WiFi.status() != WL_CONNECTED && n < 30) { delay(500); Serial.print("."); n++; }
  Serial.println(WiFi.status() == WL_CONNECTED ? "\nWiFi OK" : "\nWiFi FAIL");
}

void loop() {
  if (Serial2.available()) {
    String cmd = Serial2.readStringUntil('\n');
    cmd.trim();
    if (cmd.length() == 0) return;

    Serial.println("收到: " + cmd);

    if (WiFi.status() == WL_CONNECTED) {
      bool isSOS = (cmd.indexOf("救命")>=0 || cmd.indexOf("摔倒")>=0 ||
                    cmd.indexOf("救我")>=0 || cmd.indexOf("快来帮我")>=0);

      HTTPClient http;
      http.begin(SERVER);
      http.addHeader("Content-Type", "application/json");
      String json = "{\"deviceId\":\"ESP32_001\",\"type\":\"";
      json += isSOS ? "voice_sos" : "voice_msg";
      json += "\",\"text\":\"" + cmd + "\"}";
      http.POST(json);
      http.end();
      Serial.println(isSOS ? "🚨 已发云端" : "📤 已发云端");
    }
  }
  delay(10);
}
