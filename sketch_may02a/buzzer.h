#ifndef BUZZER_H
#define BUZZER_H

#include <Arduino.h>
#include "config.h"

void initBuzzer() {
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, HIGH);  // 高电平关闭（有源蜂鸣器）
}

// 短促告警（跌倒确认时）
void alarmBuzzer() {
  for (int i = 0; i < 8; i++) {
    digitalWrite(BUZZER_PIN, LOW);   // 响
    delay(200);
    digitalWrite(BUZZER_PIN, HIGH);  // 停
    delay(200);
  }
}

// 持续急促告警（SOS 时）
void alarmBuzzerUrgent() {
  for (int i = 0; i < 20; i++) {
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
  }
}

// 短提示音
void beepOK() {
  digitalWrite(BUZZER_PIN, LOW);
  delay(100);
  digitalWrite(BUZZER_PIN, HIGH);
}

#endif

