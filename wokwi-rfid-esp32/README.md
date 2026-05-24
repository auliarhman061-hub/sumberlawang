# Wokwi RFID Simulator — Lentera Sumberlawang

Simulasi ESP32 + MFRC522 + LCD 16x2 I2C untuk testing presensi tanpa hardware fisik.

## File

- `wokwi-rfid-esp32.ino` — Program Arduino/ESP32 (copy ke Wokwi)
- `diagram.json` — Wiring diagram untuk Wokwi

## Cara Pakai

1. Buka [wokwi.com](https://wokwi.com)
2. Buat project baru → pilih **ESP32**
3. Copy isi `wokwi-rfid-esp32.ino` ke editor Wokwi
4. Diagram auto-generate, atau import `diagram.json`
5. Klik ▶️ Run

## Konfigurasi

| Parameter          | Value                          |
|--------------------|-------------------------------|
| API_BASE_URL       | `https://lentera-sumberlawang.vercel.app` |
| API_KEY            | `gate_utama_secret_key`       |
| DEVICE_ID          | `ESP32_WOKWI`                 |

## Database Siswa

| UID        | Nama                  |
|------------|----------------------|
| 01020304   | Putri Wulandari      |
| 11223344   | Septa DWI Cahyo      |
| 55667788   | Yusuf Fakih Syamaidzar |
| AABBCCDD   | Salsabila Hana Pradipta |
| C0FFEE99   | Meilana Afif Mahmudi |

## Endpoint API

```
POST /api/attendance/tap
Header: X-Device-Key: gate_utama_secret_key
Body: {
  "rfid_uid": "01020304",
  "device_id": "ESP32_WOKWI",
  "timestamp": "2026-05-17T07:30:00+07:00"
}
```

## Respons API

| HTTP | Arti |
|------|------|
| 200  | Sukses, presensi tercatat |
| 409  | Duplicate tap (< 5 menit) |
| 401  | API Key salah |
| 404  | RFID / Device tidak ditemukan |
| 400  | Di luar jam sekolah (06:00–08:30) |

## Wiring (Wokwi)

```
ESP32          MFRC522
──────         ────────
D5  (GPIO5)  → SDA
D22 (GPIO22) → RST
D23 (GPIO23) → MOSI
D19 (GPIO19) → MISO
D18 (GPIO18) → SCK
3.3V          → 3.3V
GND           → GND

ESP32          LCD I2C (0x27)
──────         ──────────────
D21 (GPIO21) → SDA
D22 (GPIO22) → SCL (reuse pin RST — aman di Wokwi)
3.3V          → VCC
GND           → GND
```

## Demo Test (PowerShell)

```powershell
Invoke-RestMethod -Method POST `
  -Uri "https://lentera-sumberlawang.vercel.app/api/attendance/tap" `
  -Headers @{"X-Device-Key"="gate_utama_secret_key";"Content-Type"="application/json"} `
  -Body '{"rfid_uid":"01020304","device_id":"ESP32_WOKWI","timestamp":"2026-05-17T07:00:00+07:00"}'
```