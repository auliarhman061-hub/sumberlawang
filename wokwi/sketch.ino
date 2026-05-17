/**
 * Lentera Sumberlawang — ESP32 RFID Attendance
 * SMAN 1 Sumberlawang
 *
 * Komponen: ESP32 + RC522 + LCD I2C + LED RGB + Buzzer
 * Kirim data tap ke Next.js API
 */

#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============================================
// KONFIGURASI — Update sesuai environment
// ============================================
#define WIFI_SSID "Wokwi-GUEST"
#define WIFI_PASS ""

#define API_HOST "YOUR_NGROK_URL.ngrok.io"  // Ganti dengan ngrok URL
#define DEVICE_ID "ESP32_GATE_UTAMA"
#define DEVICE_KEY "gate_utama_secret_key"  // Harus sama dengan .env DEVICE_API_KEY

// ============================================
// PIN DEFINITIONS
// ============================================
#define SS_PIN    5
#define RST_PIN   27
#define LED_RED   13
#define LED_GREEN 12
#define LED_YELLOW 14
#define BUZZER_PIN 25

// ============================================
// OBJEK
// ============================================
MFRC522 mfrc522(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ============================================
// STATE
// ============================================
bool wifiConnected = false;
unsigned long lastTapTime = 0;
const unsigned long TAP_COOLDOWN = 3000; // 3 detik cooldown

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  SPI.begin();

  // Init RFID
  mfrc522.PCD_Init();
  Serial.println("RFID RC522 siap");

  // Init LCD
  lcd.init();
  lcd.backlight();
  lcd.print("Lentera Srcwlg");
  lcd.setCursor(0, 1);
  lcd.print("Sistem Presensi");

  delay(1000);

  // Init LED & Buzzer pins
  pinMode(LED_RED, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_RED, LOW);
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_YELLOW, LOW);

  // Connect WiFi
  connectWiFi();
}

// ============================================
// LOOP
// ============================================
void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    connectWiFi();
  }

  // Scan RFID card
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    // Cek cooldown
    if (millis() - lastTapTime < TAP_COOLDOWN) {
      lcd.clear();
      lcd.print("TUNGGU sebentar...");
      delay(1000);
      mfrc522.PICC_HaltA();
      return;
    }

    String uid = getRfidUID();
    Serial.println("Kartu terdeteksi: " + uid);

    sendTapToServer(uid);
    lastTapTime = millis();

    mfrc522.PICC_HaltA();
  }

  delay(50);
}

// ============================================
// WIFI
// ============================================
void connectWiFi() {
  lcd.clear();
  lcd.print("Menghubungkan");
  lcd.setCursor(0, 1);
  lcd.print("WiFi...");

  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\nWiFi connected: " + WiFi.localIP().toString());

    lcd.clear();
    lcd.print("WiFi Terhubung");
    lcd.setCursor(0, 1);
    lcd.print("Siap Tap Kartu!");
    setLED("green");
  } else {
    wifiConnected = false;
    lcd.clear();
    lcd.print("WiFi GAGAL!");
    lcd.setCursor(0, 1);
    lcd.print("Cek konfigurasi");
    setLED("red");
    beep(3);
  }
}

// ============================================
// RFID UTILS
// ============================================
String getRfidUID() {
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(mfrc522.uid.uidByte[i], HEX);
    if (i < mfrc522.uid.size - 1) uid += ":";
  }
  uid.toUpperCase();
  return uid;
}

// ============================================
// LED & BUZZER
// ============================================
void setLED(const char* color) {
  digitalWrite(LED_RED, LOW);
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_YELLOW, LOW);

  if (strcmp(color, "red") == 0) digitalWrite(LED_RED, HIGH);
  else if (strcmp(color, "green") == 0) digitalWrite(LED_GREEN, HIGH);
  else if (strcmp(color, "yellow") == 0) digitalWrite(LED_YELLOW, HIGH);
  // "off" = all LOW
}

void beep(int count) {
  for (int i = 0; i < count; i++) {
    tone(BUZZER_PIN, 1000);
    delay(150);
    noTone(BUZZER_PIN);
    delay(100);
  }
}

// ============================================
// HTTP REQUEST
// ============================================
void sendTapToServer(String uid) {
  if (!wifiConnected) {
    lcd.clear();
    lcd.print("WiFi Terputus!");
    setLED("red");
    beep(3);
    return;
  }

  HTTPClient http;
  String url = "https://" + String(API_HOST) + "/api/attendance/tap";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);

  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["rfid_uid"] = uid;
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = getISO timestamp();

  String payload;
  serializeJson(doc, payload);

  lcd.clear();
  lcd.print("Mengirim data...");
  setLED("off");

  int httpCode = http.POST(payload);
  String response = http.getString();
  http.end();

  Serial.println("HTTP " + String(httpCode));
  Serial.println("Response: " + response);

  // Parse response
  StaticJsonDocument<256> resp;
  DeserializationError error = deserializeJson(resp, response);

  if (httpCode == 200 && !error) {
    const char* status = resp["status"];
    const char* studentName = resp["student_name"] ?? "Unknown";
    const char* message = resp["message"] ?? "";

    if (strcmp(status, "present") == 0) {
      lcd.clear();
      lcd.print("HADIR");
      lcd.setCursor(0, 1);
      lcd.print(studentName);
      setLED("green");
      beep(1);
    } else if (strcmp(status, "late") == 0) {
      lcd.clear();
      lcd.print("TERLAMBAT");
      lcd.setCursor(0, 1);
      lcd.print(studentName);
      setLED("yellow");
      beep(2);
    } else {
      lcd.clear();
      lcd.print("STATUS: ");
      lcd.print(status);
      setLED("yellow");
      beep(2);
    }

    delay(3000);
    lcd.clear();
    lcd.print("Siap Tap Kartu!");
    setLED("green");

  } else if (httpCode == 404) {
    lcd.clear();
    lcd.print("KARTU TIDAK");
    lcd.setCursor(0, 1);
    lcd.print("DIKENAL");
    setLED("red");
    beep(3);
    delay(3000);
    lcd.clear();
    lcd.print("Siap Tap Kartu!");
    setLED("green");

  } else if (httpCode == 409) {
    lcd.clear();
    lcd.print("SUDAH TERATUR");
    lcd.setCursor(0, 1);
    lcd.print("5 menit lalu");
    setLED("yellow");
    beep(2);
    delay(3000);
    lcd.clear();
    lcd.print("Siap Tap Kartu!");
    setLED("green");

  } else if (httpCode == 400) {
    lcd.clear();
    lcd.print("DI LUAR JAM");
    lcd.setCursor(0, 1);
    lcd.print("SEKOLAH");
    setLED("red");
    beep(2);
    delay(3000);
    lcd.clear();
    lcd.print("Siap Tap Kartu!");
    setLED("green");

  } else {
    lcd.clear();
    lcd.print("SERVER ERROR");
    lcd.setCursor(0, 1);
    lcd.print("Coba lagi");
    setLED("red");
    for (int i = 0; i < 5; i++) {
      digitalWrite(LED_RED, !digitalRead(LED_RED));
      delay(200);
    }
    setLED("off");
    delay(2000);
    lcd.clear();
    lcd.print("Siap Tap Kartu!");
    setLED("green");
  }
}

// ============================================
// UTILITIES
// ============================================
String getISO timestamp() {
  time_t now = time(nullptr);
  struct tm* ptm = localtime(&now);
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%S+07:00", ptm);
  return String(buffer);
}