#ifndef GPS_H
#define GPS_H

#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include "config.h"

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);  // Serial2

float currentLat = 0;
float currentLng = 0;
bool gpsValid = false;

void initGPS() {
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  Serial.println("[GPS] Initialized (NEO-6M on Serial2)");
}

void readGPS() {
  while (gpsSerial.available() > 0) {
    char c = gpsSerial.read();
    if (gps.encode(c)) {
      if (gps.location.isValid()) {
        currentLat = gps.location.lat();
        currentLng = gps.location.lng();
        gpsValid = true;
      } else {
        gpsValid = false;
      }
    }
  }
}

float getLatitude() {
  return currentLat;
}

float getLongitude() {
  return currentLng;
}

bool isGPSValid() {
  return gpsValid;
}

#endif
