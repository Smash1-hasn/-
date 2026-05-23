#ifndef ASR_H
#define ASR_H

#include <Arduino.h>
#include "config.h"

// ASR Pro 串口（接 ESP32 的另一个串口，不是 SIM7600 那个）
HardwareSerial asrSerial(2);  // Serial2: RX=ASR_PRO_RX, TX=ASR_PRO_TX

String asrLastText = "";
bool asrHasNewText = false;
unsigned long asrLastActive = 0;

void initASR() {
  asrSerial.begin(115200, SERIAL_8N1, ASR_RX_PIN, ASR_TX_PIN);
  Serial.println("[ASR] Voice module ready");
}

// 读取 ASR 发来的文字
void readASR() {
  static String buffer = "";
  while (asrSerial.available()) {
    char c = asrSerial.read();
    if (c == '\n' || c == '\r') {
      if (buffer.length() > 0) {
        asrLastText = buffer;
        asrHasNewText = true;
        asrLastActive = millis();
        Serial.print("[ASR] Heard: ");
        Serial.println(asrLastText);
        buffer = "";
      }
    } else {
      buffer += c;
    }
    if (buffer.length() > 100) buffer = "";  // 防止溢出
  }
}

// 判断是否是求救关键词
bool isSOSWord(String text) {
  text.toLowerCase();
  return (text.indexOf("救命") >= 0) ||
         (text.indexOf("摔倒") >= 0) ||
         (text.indexOf("救我") >= 0) ||
         (text.indexOf("快来帮我") >= 0) ||
         (text.indexOf("不行") >= 0);
}

// 获取最新语音内容并清除标记
String getASRText() {
  asrHasNewText = false;
  String t = asrLastText;
  asrLastText = "";
  return t;
}

#endif
