#ifndef SENSORS_H
#define SENSORS_H

#include <Wire.h>
#include "config.h"

// MPU6050 数据结构
struct MPUData {
  int16_t ax, ay, az;     // 加速度原始值
  int16_t gx, gy, gz;     // 陀螺仪原始值
  float accG;              // 合成加速度 (g)
  float gyroMag;           // 陀螺仪合成角速度
  float pitch, roll;       // 估算姿态角
};

struct SensorData {
  MPUData mpu;
  bool fallDetected;
  bool sosPressed;
  int rssi;
};

// MPU6050 初始化
void initMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); Wire.write(0x00);  // 唤醒
  Wire.endTransmission(true);
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x1C); Wire.write(0x18);  // ±16g量程
  Wire.endTransmission(true);
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x1B); Wire.write(0x18);  // ±2000°/s
  Wire.endTransmission(true);
}

// 读取 MPU6050 所有数据
void readMPU6050(MPUData &mpu) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true);

  mpu.ax = (Wire.read() << 8) | Wire.read();
  mpu.ay = (Wire.read() << 8) | Wire.read();
  mpu.az = (Wire.read() << 8) | Wire.read();
  Wire.read(); Wire.read();          // 跳过温度
  mpu.gx = (Wire.read() << 8) | Wire.read();
  mpu.gy = (Wire.read() << 8) | Wire.read();
  mpu.gz = (Wire.read() << 8) | Wire.read();

  float ax_g = mpu.ax / 2048.0;     // ±16g: 2048 LSB/g
  float ay_g = mpu.ay / 2048.0;
  float az_g = mpu.az / 2048.0;
  mpu.accG = sqrt(ax_g*ax_g + ay_g*ay_g + az_g*az_g);

  float gx_dps = mpu.gx / 16.4;     // ±2000°/s: 16.4 LSB/(°/s)
  float gy_dps = mpu.gy / 16.4;
  float gz_dps = mpu.gz / 16.4;
  mpu.gyroMag = sqrt(gx_dps*gx_dps + gy_dps*gy_dps + gz_dps*gz_dps);

  mpu.pitch = atan2(-ax_g, sqrt(ay_g*ay_g + az_g*az_g)) * 180.0 / PI;
  mpu.roll  = atan2(ay_g, az_g) * 180.0 / PI;
}

// SOS 按键
bool readSOS() {
  return digitalRead(SOS_PIN) == LOW;
}

int readRSSI() { return 0; }  // WiFi 未初始化时返回0

// 初始化所有传感器
void initSensors() {
  Wire.begin(SDA_PIN, SCL_PIN);
  initMPU6050();
  pinMode(SOS_PIN, INPUT_PULLUP);
  Serial.println("[SENSOR] Ready");
}

// 一次读取所有数据
SensorData readAllSensors() {
  SensorData data;
  readMPU6050(data.mpu);
  data.fallDetected = false;  // fall_detect.h 里设置
  data.sosPressed = readSOS();
  data.rssi = readRSSI();
  return data;
}

#endif
