#ifndef CONFIG_H
#define CONFIG_H

// ==================== WiFi ====================
#define WIFI_SSID "神都会偏爱"
#define WIFI_PASSWORD "051024laopo"

// ==================== 云函数 URL ====================
#define CLOUD_FUNC_URL "https://cloud2-d2g7yeednd8ac1836.service.tcloudbase.com/deviceDataIngest"

// ==================== 设备ID ====================
#define DEVICE_ID "ESP32_001"

// ==================== ASR Pro ====================
#define ASR_RX_PIN 33   // ASR Pro TX → ESP32 GPIO33

// ==================== 告警关键词 ====================
#define FALL_ACC_THRESHOLD 2.2
#define ALARM_COOLDOWN 20000
#define DATA_UPLOAD_INTERVAL 5000

#endif
