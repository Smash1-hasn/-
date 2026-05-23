#ifndef FALL_DETECT_H
#define FALL_DETECT_H

#include "config.h"
#include "sensors.h"

enum FallState {
  STATE_NORMAL,
  STATE_FREE_FALL,   // 检测到失重
  STATE_IMPACT,      // 检测到撞击
  STATE_LYING,       // 倒地姿态确认
  STATE_CONFIRMED    // 跌倒确认
};

struct FallDetector {
  FallState state = STATE_NORMAL;
  unsigned long impactTime = 0;
  unsigned long lyingStartTime = 0;
  unsigned long lastAlarmTime = 0;
  bool alarmActive = false;
  String alarmReason = "";
};

FallDetector fallDet;

// ==================== 跌倒检测主逻辑 ====================
bool detectFall(SensorData &data) {
  float acc = data.mpu.accG;
  float gyro = data.mpu.gyroMag;
  float pitch = data.mpu.pitch;
  unsigned long now = millis();

  switch (fallDet.state) {

    case STATE_NORMAL:
      // 检测自由落体: 合加速度 < 0.4g 且陀螺仪变化大
      if (acc < 0.4 && gyro > 150) {
        fallDet.state = STATE_FREE_FALL;
        fallDet.impactTime = now;
      }
      // 直接大加速度撞击
      else if (acc > FALL_ACC_THRESHOLD) {
        fallDet.state = STATE_IMPACT;
        fallDet.impactTime = now;
      }
      break;

    case STATE_FREE_FALL:
      // 自由落体后检测撞击
      if (acc > FALL_ACC_THRESHOLD) {
        fallDet.state = STATE_IMPACT;
        fallDet.impactTime = now;
      }
      // 1秒内未撞击 → 恢复正常
      else if (now - fallDet.impactTime > 1000) {
        fallDet.state = STATE_NORMAL;
      }
      break;

    case STATE_IMPACT:
      // 撞击后检查姿态: 是否躺倒了
      // 俯仰角 > 50° 或 < -50° → 身体倾斜严重
      if (abs(pitch) > 50 && acc < 1.5) {
        if (fallDet.lyingStartTime == 0) {
          fallDet.lyingStartTime = now;
        }
        // 持续倒地 3 秒 → 确认跌倒
        if (now - fallDet.lyingStartTime > FALL_CONFIRM_TIME) {
          fallDet.state = STATE_CONFIRMED;
        }
      }
      // 姿态正常 → 可能是弯腰后站起了
      else if (abs(pitch) < 30 && acc > 0.8 && acc < 1.5) {
        fallDet.state = STATE_NORMAL;
        fallDet.lyingStartTime = 0;
      }
      // 超过 5 秒未确认 → 恢复正常
      if (now - fallDet.impactTime > 5000) {
        fallDet.state = STATE_NORMAL;
        fallDet.lyingStartTime = 0;
      }
      break;

    case STATE_CONFIRMED:
      // 跌倒确认，触发告警
      if (now - fallDet.lastAlarmTime > ALARM_COOLDOWN) {
        fallDet.alarmActive = true;
        fallDet.alarmReason = "跌倒检测";
        fallDet.lastAlarmTime = now;
        Serial.println("[FALL] !!! 跌倒确认 !!!");
        data.fallDetected = true;
        return true;
      }
      // 姿态恢复正常 → 重置
      if (abs(pitch) < 30 && acc > 0.8) {
        fallDet.state = STATE_NORMAL;
        fallDet.lyingStartTime = 0;
        fallDet.alarmActive = false;
      }
      break;
  }

  data.fallDetected = fallDet.alarmActive;
  return fallDet.alarmActive;
}

// ==================== 获取告警原因 ====================
String getAlarmReason() {
  return fallDet.alarmReason;
}

// ==================== 重置告警状态 ====================
void resetAlarm() {
  fallDet.alarmActive = false;
  fallDet.alarmReason = "";
  fallDet.state = STATE_NORMAL;
  fallDet.lyingStartTime = 0;
}

#endif
