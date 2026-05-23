// 爱即守护 - ESP32 固件 v3.2
// 功能: 读取ASRPRO语音识别结果 → 上传到云端

#include <WiFi.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>

// ==================== 配置区域（请修改） ====================
#define WIFI_SSID       "su"
#define WIFI_PASSWORD   "subowen123"
#define DEVICE_ID       "001"               // 设备编号
#define CLOUD_FUNC_URL  "https://cloud2-d2g7yeednd8ac1836.service.tcloudbase.com/deviceDataIngest"  // 云端接收地址

// 串口引脚（ASRPRO的TX接ESP32的RX）
#define ASR_RX_PIN      16      // GPIO16

// 防重复上传间隔（毫秒）
#define REPEAT_INTERVAL 10000

// ==================== 全局变量 ====================
HardwareSerial asrSerial(2);   // 使用 UART2
String lastText = "";
unsigned long lastUploadTime = 0;
unsigned long lastReconnectAttempt = 0;

// ==================== 上传到云端 ====================
void uploadToCloud(String text) {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[WiFi] 未连接，无法上传");
        return;
    }
    
    // 判断是否为求救（可根据实际需要修改关键词）
    bool isSOS = (text.indexOf("救命") != -1) ||
                 (text.indexOf("摔倒") != -1) ||
                 (text.indexOf("救我") != -1) ||
                 (text.indexOf("我不舒服") != -1) ||
                 (text.indexOf("难受") != -1);
    
    // 构造 JSON
    String json = "{";
    json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
    json += "\"type\":\"" + String(isSOS ? "voice_sos" : "voice_msg") + "\",";
    json += "\"text\":\"" + text + "\",";
    json += "\"timestamp\":" + String(millis());
    json += "}";
    
    HTTPClient http;
    http.begin(CLOUD_FUNC_URL);
    http.addHeader("Content-Type", "application/json");
    
    int httpCode = http.POST(json);
    if (httpCode == 200) {
        Serial.println("[HTTP] 上传成功");
    } else {
        Serial.printf("[HTTP] 上传失败，错误码: %d\n", httpCode);
    }
    http.end();
}

// ==================== 初始化 ====================
void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n=== 爱即守护 v3.2 ===");
    
    // 初始化串口2（只接收，不发送）
    asrSerial.begin(115200, SERIAL_8N1, ASR_RX_PIN, -1);
    Serial.println("[ASR] 串口已初始化");
    
    // 连接WiFi
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("[WiFi] 正在连接");
    int tries = 0;
    while (WiFi.status() != WL_CONNECTED && tries < 30) {
        delay(500);
        Serial.print(".");
        tries++;
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[WiFi] 连接成功，IP: " + WiFi.localIP().toString());
    } else {
        Serial.println("\n[WiFi] 连接失败，请检查配置");
    }
}

// ==================== 主循环 ====================
void loop() {
    // 读取ASRPRO发送的数据
    static String buffer = "";
    while (asrSerial.available()) {
        char c = asrSerial.read();
        if (c == '\n' || c == '\r') {
            if (buffer.length() > 0) {
                String currentText = buffer;
                buffer = "";
                Serial.println("[ASR] " + currentText);
                
                // 防重复上传：相同内容且时间间隔小于阈值则跳过
                unsigned long now = millis();
                if (currentText != lastText || (now - lastUploadTime) > REPEAT_INTERVAL) {
                    lastText = currentText;
                    lastUploadTime = now;
                    uploadToCloud(currentText);
                } else {
                    Serial.println("[跳过] 重复内容或过于频繁");
                }
            }
        } else {
            buffer += c;
            if (buffer.length() > 200) buffer = ""; // 防止溢出
        }
    }
    
    // WiFi断线重连
    if (WiFi.status() != WL_CONNECTED) {
        unsigned long now = millis();
        if (now - lastReconnectAttempt > 10000) {
            lastReconnectAttempt = now;
            Serial.println("[WiFi] 断线，尝试重连...");
            WiFi.reconnect();  // 或者 WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        }
    }
    
    delay(10);
}
