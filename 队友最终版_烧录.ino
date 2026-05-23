// 爱即守护 ESP32 v3.4
// 改第9-10行WiFi，上传即可
// ASR Pro 输出英文：help/fell/ok/miss/pill

#include <WiFi.h>
#include <HTTPClient.h>

#define WIFI_SSID "su"
#define WIFI_PASS "subowen123"
#define DEVICE_ID "001"
#define SERVER "https://cloud2-d2g7yeednd8ac1836-1433086696.ap-shanghai.app.tcloudbase.com/deviceDataIngest"
#define ASR_RX 16

HardwareSerial asr(2);
String lastText = "";
unsigned long lastUpload = 0;

void setup() {
  Serial.begin(115200);
  asr.begin(115200, SERIAL_8N1, ASR_RX, -1);
  Serial.println("=== 爱即守护 v3.4 ===");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int n = 0;
  while (WiFi.status() != WL_CONNECTED && n < 30) { delay(500); Serial.print("."); n++; }
  Serial.println(WiFi.status() == WL_CONNECTED ? "\nWiFi OK" : "\nWiFi FAIL");
}

void loop() {
  if (asr.available()) {
    String text = asr.readStringUntil('\n');
    text.trim();
    if (text.length() == 0) return;

    Serial.println("[ASR] " + text);

    bool isSOS = (text == "help" || text == "fell");

    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(SERVER);
      http.addHeader("Content-Type", "application/json");
      String json = "{\"deviceId\":\"001\",\"type\":\"";
      json += isSOS ? "voice_sos" : "voice_msg";
      json += "\",\"text\":\"" + text + "\"}";
      int code = http.POST(json);
      http.end();
      Serial.println(isSOS ? "SOS OK " + String(code) : "MSG OK " + String(code));
    }
  }
  delay(10);
}
