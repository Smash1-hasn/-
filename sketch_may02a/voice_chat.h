#ifndef VOICE_CHAT_H
#define VOICE_CHAT_H

#include <driver/i2s.h>
#include <HTTPClient.h>
#include "config.h"

// ==================== I2S 引脚 ====================
#define I2S_MIC_WS   25   // INMP441 L/R (Word Select)
#define I2S_MIC_SCK  26   // INMP441 SCK (Serial Clock)
#define I2S_MIC_SD   32   // INMP441 SD  (Serial Data)

#define I2S_SPK_BCK  22   // MAX98357 BCLK
#define I2S_SPK_WS   21   // MAX98357 LRC
#define I2S_SPK_DIN  19   // MAX98357 DIN

#define VOICE_BTN_PIN 5   // 语音按钮

// ==================== 录音参数 ====================
#define SAMPLE_RATE     16000
#define RECORD_SECONDS  5
#define BUFFER_SIZE     (SAMPLE_RATE * RECORD_SECONDS * 2) // 16bit mono

int16_t* audioBuffer = nullptr;
bool isRecording = false;

// ==================== 初始化 I2S 麦克风 ====================
void initI2SMic() {
  i2s_config_t mic_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 1024,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };

  i2s_pin_config_t mic_pins = {
    .bck_io_num = I2S_MIC_SCK,
    .ws_io_num = I2S_MIC_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S_MIC_SD
  };

  i2s_driver_install(I2S_NUM_0, &mic_config, 0, NULL);
  i2s_set_pin(I2S_NUM_0, &mic_pins);
  Serial.println("[VOICE] Mic ready");
}

// ==================== 初始化 I2S 喇叭 ====================
void initI2SSpeaker() {
  i2s_config_t spk_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 1024,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };

  i2s_pin_config_t spk_pins = {
    .bck_io_num = I2S_SPK_BCK,
    .ws_io_num = I2S_SPK_WS,
    .data_out_num = I2S_SPK_DIN,
    .data_in_num = I2S_PIN_NO_CHANGE
  };

  i2s_driver_install(I2S_NUM_1, &spk_config, 0, NULL);
  i2s_set_pin(I2S_NUM_1, &spk_pins);
  Serial.println("[VOICE] Speaker ready");
}

// ==================== 录音 ====================
bool recordAudio() {
  audioBuffer = (int16_t*)malloc(BUFFER_SIZE);
  if (!audioBuffer) return false;

  size_t bytesRead = 0;
  unsigned long startTime = millis();

  Serial.println("[VOICE] Recording...");
  while (millis() - startTime < RECORD_SECONDS * 1000) {
    size_t bytesAvailable = 0;
    i2s_read(I2S_NUM_0, audioBuffer + bytesRead / 2,
             BUFFER_SIZE - bytesRead, &bytesAvailable, portMAX_DELAY);
    bytesRead += bytesAvailable;
    if (bytesRead >= BUFFER_SIZE) break;
  }
  Serial.printf("[VOICE] Recorded %d bytes\n", bytesRead);
  return true;
}

// ==================== 调用百度语音识别 (STT) ====================
String speechToText() {
  if (!audioBuffer) return "";

  HTTPClient http;
  String token = getBaiduToken();
  String url = "http://vop.baidu.com/server_api?dev_pid=1537&cuid=ESP32&token=" + token;
  http.begin(url);
  http.addHeader("Content-Type", "audio/pcm;rate=16000");

  String response = "";
  int code = http.POST((uint8_t*)audioBuffer, BUFFER_SIZE);
  if (code == 200) {
    response = http.getString();
    // 解析 result
    int p = response.indexOf("\"result\":[\"");
    if (p > 0) {
      int e = response.indexOf("\"]", p + 11);
      response = response.substring(p + 11, e);
    }
    Serial.println("[STT] " + response);
  }
  http.end();
  return response;
}

// ==================== 调用 DeepSeek Chat ====================
String aiChat(String text) {
  if (text.length() == 0) return "";

  HTTPClient http;
  http.begin("https://api.deepseek.com/v1/chat/completions");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + String(DEEPSEEK_API_KEY));

  String body = "{"
    "\"model\":\"deepseek-chat\","
    "\"messages\":["
      "{\"role\":\"system\",\"content\":\"你是小安，老年人AI陪聊伙伴。回复简短口语化，2-4句话。\"},"
      "{\"role\":\"user\",\"content\":\"" + text + "\"}"
    "],"
    "\"temperature\":0.7,\"max_tokens\":400"
  "}";

  String response = "";
  int code = http.POST(body);
  if (code == 200) {
    String json = http.getString();
    int p = json.indexOf("\"content\":\"");
    if (p > 0) {
      int e = json.indexOf("\"", p + 12);
      response = json.substring(p + 12, e - (json.charAt(e-1)=='\\' ? 1 : 0));
    }
    Serial.println("[AI] " + response);
  }
  http.end();
  return response;
}

// ==================== 调用 Edge TTS ====================
bool playTTS(String text) {
  if (text.length() == 0) return false;

  // Edge TTS 免费 API
  HTTPClient http;
  String encoded = urlencode(text);
  http.begin("https://tts-edge.example.com/tts?text=" + encoded + "&voice=zh-CN-XiaoxiaoNeural");

  int code = http.GET();
  if (code == 200) {
    WiFiClient* stream = http.getStreamPtr();
    uint8_t buff[1024];
    Serial.println("[TTS] Playing...");
    while (stream->available()) {
      int len = stream->readBytes(buff, sizeof(buff));
      size_t written;
      i2s_write(I2S_NUM_1, buff, len, &written, portMAX_DELAY);
    }
    Serial.println("[TTS] Done");
    http.end();
    free(audioBuffer); audioBuffer = nullptr;
    return true;
  }
  http.end();
  return false;
}

// ==================== 百度 Token ====================
String getBaiduToken() {
  HTTPClient http;
  String url = "https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials"
    "&client_id=" + String(BAIDU_API_KEY) +
    "&client_secret=" + String(BAIDU_SECRET_KEY);
  http.begin(url);
  String token = "";
  if (http.GET() == 200) {
    String json = http.getString();
    int p = json.indexOf("\"access_token\":\"");
    if (p > 0) {
      int e = json.indexOf("\"", p + 16);
      token = json.substring(p + 16, e);
    }
  }
  http.end();
  return token;
}

// ==================== 播放 TTS 音频 ====================
bool playTTSAudio(String text) {
  if (text.length() == 0) return false;

  // 调用 Edge TTS API 获取音频
  HTTPClient http;
  String url = String(TTS_API_URL) + "?text=" + urlencode(text);
  http.begin(url);

  int code = http.GET();
  if (code == 200) {
    WiFiClient* stream = http.getStreamPtr();
    uint8_t buff[1024];
    Serial.println("[VOICE] Playing...");
    while (stream->available()) {
      int len = stream->readBytes(buff, sizeof(buff));
      size_t written;
      i2s_write(I2S_NUM_1, buff, len, &written, portMAX_DELAY);
    }
    Serial.println("[VOICE] Playback done");
    http.end();
    return true;
  } else {
    Serial.printf("[VOICE] TTS failed: %d\n", code);
    http.end();
    return false;
  }
}

// ==================== 语音对话主流程 ====================
void voiceChatLoop() {
  static unsigned long lastVoiceChat = 0;
  static unsigned long pressStart = 0;

  // 按下开始录音
  if (digitalRead(VOICE_BTN_PIN) == LOW && pressStart == 0) {
    pressStart = millis();
    Serial.println("[VOICE] Button pressed, recording...");
    recordAudio();
  }

  // 松开发送
  if (digitalRead(VOICE_BTN_PIN) == HIGH && pressStart > 0) {
    pressStart = 0;
    if (millis() - lastVoiceChat > 3000) {
      lastVoiceChat = millis();
      Serial.println("[VOICE] Processing...");

      // 1. 语音→文字 (Baidu STT)
      String text = speechToText();
      if (text.length() == 0) {
        Serial.println("[VOICE] STT failed");
        return;
      }

      // 2. AI 对话 (DeepSeek)
      String reply = aiChat(text);
      if (reply.length() == 0) {
        Serial.println("[VOICE] AI failed");
        return;
      }

      // 3. 文字→语音 (TTS) → 播放
      if (!playTTS(reply)) {
        Serial.println("[VOICE] TTS failed");
      }
    }
  }
}

// ==================== URL 编码 ====================
String urlencode(String str) {
  String encoded = "";
  char c;
  char code0, code1;
  for (int i = 0; i < str.length(); i++) {
    c = str.charAt(i);
    if (c == ' ') encoded += '+';
    else if (isalnum(c)) encoded += c;
    else {
      code1 = (c & 0xf) + '0';
      if ((c & 0xf) > 9) code1 = (c & 0xf) - 10 + 'A';
      c = (c >> 4) & 0xf;
      code0 = c + '0';
      if (c > 9) code0 = c - 10 + 'A';
      encoded += '%'; encoded += code0; encoded += code1;
    }
  }
  return encoded;
}

#endif
