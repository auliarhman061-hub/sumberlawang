#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <time.h>

// ===========================================
// KONFIGURASI - SESUAIKAN DENGAN API
// ===========================================
const char* WIFI_SSID     = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
const char* API_BASE_URL  = "https://lentera-sumberlawang.vercel.app";
const char* API_KEY       = "gate_utama_secret_key";
const char* DEVICE_ID     = "ESP32_WOKWI";

// NTP Server untuk timestamp akurat
const char* NTP_SERVER = "pool.ntp.org";
const long GMT_OFFSET_SEC = 7 * 3600;  // WIB (+07:00)
const int DAYLIGHT_OFFSET_SEC = 0;

// ===========================================
// PIN RC522 (VSPI)
// ===========================================
#define RST_PIN   22
#define SDA_PIN    5
#define SPI_MISO  19
#define SPI_MOSI  23
#define SPI_SCK   18

MFRC522 rfid(SDA_PIN, RST_PIN);

// ===========================================
// I2C LCD
// ===========================================
#define LCD_SDA_PIN  21
#define LCD_SCL_PIN  22
#define LCD_ADDR     0x27
#define LCD_COLS     16
#define LCD_ROWS      2

LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);

// ===========================================
// DATABASE SISWA
// UID = string hex uppercase TANPA titik dua
// ===========================================
struct Siswa {
  const char* uid;       // UID tanpa separator (contoh: "01020304")
  const char* namaLcd;  // Nama pendek LCD (<= 16 char)
  const char* namaFull;  // Nama lengkap
};

const Siswa daftarSiswa[] = {
  { "01020304", "Putri Wulandari",  "Putri Wulandari"        },
  { "11223344", "Septa DWI Cahyo",  "Septa DWI Cahyo"        },
  { "55667788", "Yusuf Fakih S.",   "Yusuf Fakih Syamaidzar"  },
  { "AABBCCDD", "Salsabila H.P.",   "Salsabila Hana Pradipta" },
  { "C0FFEE99", "Meilana A.M.",     "Meilana Afif Mahmudi"   },
};

const int JUMLAH_SISWA = sizeof(daftarSiswa) / sizeof(daftarSiswa[0]);

// ===========================================
// STATE
// ===========================================
bool wifiConnected = false;
unsigned long lastTapMs = 0;
const unsigned long TAP_COOLDOWN_MS = 3000;

// Respons API terakhir (untuk cek status HADIR/TERLAMBAT)
String lastApiResponse = "";

// ===========================================
// UTILITY
// ===========================================

// Konversi UID bytes ke string HEX uppercase TANPA titik dua
// Contoh: byte[0x01, 0x02, 0x03, 0x04] -> "01020304"
String uidToString(byte *uid, byte uidSize) {
  String result = "";
  for (byte i = 0; i < uidSize; i++) {
    if (uid[i] < 0x10) result += "0";
    result += String(uid[i], HEX);
  }
  result.toUpperCase();
  return result;
}

// Cari index siswa berdasarkan UID, return -1 jika tidak ditemukan
int cariSiswa(String uid) {
  for (int i = 0; i < JUMLAH_SISWA; i++) {
    if (uid.equals(daftarSiswa[i].uid)) return i;
  }
  return -1;
}

// Format timestamp ISO 8601 WIB (+07:00)
// Contoh: "2026-05-17T07:30:00+07:00"
String getTimestampWIB() {
  time_t now;
  time(&now);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);

  char buf[30];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S+07:00", &timeinfo);
  return String(buf);
}

// Tampilkan 2 baris di LCD
void lcdPrint(String line1, String line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  if (line1.length() > 16) line1 = line1.substring(0, 16);
  lcd.print(line1);
  if (line2.length() > 0) {
    lcd.setCursor(0, 1);
    if (line2.length() > 16) line2 = line2.substring(0, 16);
    lcd.print(line2);
  }
}

// Scroll teks di baris tertentu
void lcdScroll(String text, int row, int delayMs = 280) {
  if (text.length() <= 16) {
    lcd.setCursor(0, row);
    lcd.print(text);
    return;
  }
  String padded = "                " + text + "                ";
  for (int i = 0; i <= (int)text.length(); i++) {
    lcd.setCursor(0, row);
    lcd.print(padded.substring(i, i + 16));
    delay(delayMs);
  }
}

// Cek apakah response berisi "late"
bool isLateResponse() {
  return lastApiResponse.indexOf("\"late\"") != -1;
}

// Kirim data presensi ke server API Lentera
// Endpoint: POST /api/attendance/tap
// Header: X-Device-Key
// Body: {rfid_uid, device_id, timestamp}
bool kirimPresensi(String uid, String namaFull) {
  HTTPClient http;
  String url = String(API_BASE_URL) + "/api/attendance/tap";

  String timestamp = getTimestampWIB();

  // Payload JSON sesuai format API
  String payload = "{"
    "\"rfid_uid\":\"" + uid + "\","
    "\"device_id\":\"" + DEVICE_ID + "\","
    "\"timestamp\":\"" + timestamp + "\""
  "}";

  Serial.println("\n========================================");
  Serial.println("  KIRIM DATA PRESENSI");
  Serial.println("========================================");
  Serial.println("URL      : " + url);
  Serial.println("Device ID: " + DEVICE_ID);
  Serial.println("UID      : " + uid);
  Serial.println("Nama     : " + namaFull);
  Serial.println("Time     : " + timestamp);
  Serial.println("Payload  : " + payload);
  Serial.println("----------------------------------------");

  lcdPrint("Mengirim...", namaFull.substring(0, min((int)namaFull.length(), 16)));

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", API_KEY);

  int httpCode = http.POST(payload);
  lastApiResponse = http.getString();

  Serial.print("HTTP Code : "); Serial.println(httpCode);
  Serial.print("Response  : "); Serial.println(lastApiResponse);

  http.end();

  // 200 = success, 409 = duplicate tap (tetap dianggap berhasil dari sisi user)
  return (httpCode == 200 || httpCode == 409);
}

// ===========================================
// SETUP
// ===========================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n==========================================");
  Serial.println("  LENTERA SUMBERLAWANG");
  Serial.println("  Sistem Presensi RFID");
  Serial.println("  SMAN 1 Sumberlawang");
  Serial.println("==========================================");
  Serial.println("\n  Daftar Siswa Terdaftar:");
  for (int i = 0; i < JUMLAH_SISWA; i++) {
    Serial.println("  [" + String(i + 1) + "] " +
                   String(daftarSiswa[i].uid) + " -> " +
                   String(daftarSiswa[i].namaFull));
  }
  Serial.println("==========================================\n");

  // --- Init I2C & LCD ---
  Wire.begin(LCD_SDA_PIN, LCD_SCL_PIN);
  lcd.init();
  lcd.backlight();
  lcdPrint("Lentera", "Initializing...");
  Serial.println("LCD I2C Initialized (0x" + String(LCD_ADDR, HEX) + ")");
  delay(1000);

  // --- Connect WiFi ---
  lcdPrint("Konek WiFi...", String(WIFI_SSID));
  Serial.print("Menghubungkan WiFi: "); Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    String ip = WiFi.localIP().toString();
    Serial.println("\nWiFi Terhubung! IP: " + ip);
    lcdPrint("WiFi Terhubung!", ip);
    delay(2000);

    // --- Sync waktu dengan NTP ---
    Serial.println("Sync waktu NTP...");
    configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
    struct tm timeinfo;
    if (getLocalTime(&timeinfo)) {
      char buf[30];
      strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S WIB", &timeinfo);
      Serial.println("Waktu: " + String(buf));
    }
  } else {
    wifiConnected = false;
    Serial.println("\nWiFi Gagal! Mode offline...");
    lcdPrint("WiFi GAGAL!", "Mode Offline");
    delay(2000);
  }

  // --- Init SPI & RC522 ---
  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI, SDA_PIN);
  rfid.PCD_Init();
  rfid.PCD_SetAntennaGain(MFRC522::RxGain_38dB);
  Serial.println("RC522 Initialized");

  lcdPrint("Tap Kartu RFID", "untuk Presensi");
  Serial.println("Sistem siap! Tap kartu RFID...\n");
}

// ===========================================
// LOOP
// ===========================================
void loop() {
  // Cek & reconnect WiFi bila terputus
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiConnected) {
      Serial.println("WiFi terputus, reconnecting...");
      lcdPrint("WiFi Terputus!", "Reconnecting...");
      wifiConnected = false;
    }
    WiFi.reconnect();
    delay(5000);
    if (WiFi.status() == WL_CONNECTED) {
      wifiConnected = true;
      Serial.println("WiFi Kembali! IP: " + WiFi.localIP().toString());
      lcdPrint("WiFi Kembali!", WiFi.localIP().toString());
      delay(1500);
      lcdPrint("Tap Kartu RFID", "untuk Presensi");
    }
    return;
  }

  // Anti double-tap (cooldown 3 detik)
  unsigned long now = millis();
  if (now - lastTapMs < TAP_COOLDOWN_MS) { delay(100); return; }

  // Deteksi kartu RFID
  if (!rfid.PICC_IsNewCardPresent()) { delay(50); return; }
  if (!rfid.PICC_ReadCardSerial())   { delay(50); return; }

  lastTapMs = now;

  String uid = uidToString(rfid.uid.uidByte, rfid.uid.size);
  Serial.println("\nKARTU TERDETEKSI: " + uid);

  int idx = cariSiswa(uid);

  if (idx == -1) {
    // UID tidak terdaftar
    Serial.println("  UID tidak dikenal!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Kartu Tdk Diknl");
    lcd.setCursor(0, 1);
    lcd.print(uid);
    delay(2500);

  } else {
    // Siswa ditemukan
    String namaLcd  = String(daftarSiswa[idx].namaLcd);
    String namaFull = String(daftarSiswa[idx].namaFull);

    Serial.println("  Nama: " + namaFull);

    // Sapa siswa
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Halo,");
    lcdScroll(namaLcd, 1, 280);
    delay(300);

    // Kirim presensi
    bool success = kirimPresensi(uid, namaFull);

    lcd.clear();
    lcd.setCursor(0, 0);
    if (success) {
      // Baca respons API untuk tentukan HADIR atau TERLAMBAT
      if (isLateResponse()) {
        Serial.println("  TERLAMBAT - tercatat");
        lcd.print("TERLAMBAT! :(");
      } else {
        Serial.println("  HADIR - tercatat");
        lcd.print("HADIR! :)");
      }
    } else {
      Serial.println("  Gagal mengirim data");
      lcd.print("Gagal Kirim! :(");
    }
    lcdScroll(namaLcd, 1, 280);
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  Serial.println("----------------------------------------\n");
  delay(2000);

  lcdPrint("Tap Kartu RFID", "untuk Presensi");
}