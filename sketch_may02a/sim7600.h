#ifndef SIM7600_H
#define SIM7600_H

#include <Arduino.h>
#include "config.h"

HardwareSerial sim7600(1);  // Serial1

// ==================== SIM7600 初始化 ====================
void initSIM7600() {
  sim7600.begin(115200, SERIAL_8N1, SIM_RX, SIM_TX);
  Serial.println("[SIM7600] Initializing...");

  // 发送 AT 指令测试
  sim7600.println("AT");
  delay(1000);
  while (sim7600.available()) {
    Serial.write(sim7600.read());
  }

  // 检查 SIM 卡
  sim7600.println("AT+CPIN?");
  delay(1000);
  while (sim7600.available()) {
    Serial.write(sim7600.read());
  }

  // 检查信号
  sim7600.println("AT+CSQ");
  delay(1000);
  while (sim7600.available()) {
    Serial.write(sim7600.read());
  }

  // 设置短信文本模式
  sim7600.println("AT+CMGF=1");
  delay(1000);
  while (sim7600.available()) {
    Serial.write(sim7600.read());
  }

  Serial.println("[SIM7600] Ready");
}

// ==================== 发送 AT 指令 ====================
void sendAT(String cmd, int waitMs = 1000) {
  sim7600.println(cmd);
  delay(waitMs);
  while (sim7600.available()) {
    Serial.write(sim7600.read());
  }
}

// ==================== 发送短信 ====================
bool sendSMS(String phone, String message) {
  Serial.println("[SIM7600] Sending SMS...");

  sim7600.print("AT+CMGS=\"");
  sim7600.print(phone);
  sim7600.println("\"");
  delay(2000);

  // 清空缓冲区
  while (sim7600.available()) {
    sim7600.read();
  }

  sim7600.print(message);
  delay(500);

  sim7600.write(26);  // Ctrl+Z 发送
  delay(8000);

  Serial.println("[SIM7600] SMS sent");
  return true;
}

// ==================== 拨打电话 ====================
bool makeCall(String phone) {
  Serial.print("[SIM7600] Calling: ");
  Serial.println(phone);

  sim7600.print("ATD");
  sim7600.print(phone);
  sim7600.println(";");
  delay(15000);  // 等待接通

  // 挂断
  sim7600.println("ATH");
  delay(1000);

  Serial.println("[SIM7600] Call ended");
  return true;
}

// ==================== 紧急告警（短信 + 电话） ====================
void emergencyAlert(String reason, int bpm, float temp) {
  String msg = "【紧急告警】安心守护\n";
  msg += reason + "\n";
  msg += "心率: " + String(bpm) + " BPM\n";
  msg += "体温: " + String(temp, 1) + " °C\n";
  msg += "请立即联系老人！";

  sendSMS(EMERGENCY_PHONE, msg);
  delay(3000);
  makeCall(EMERGENCY_PHONE);
}

#endif
