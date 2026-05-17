# Lentera Sumberlawang

Sistem Presensi Digital RFID untuk SMAN 1 Sumberlawang.

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Neon PostgreSQL + Drizzle ORM |
| Auth | Clerk |
| Deploy | Vercel |
| Hardware | Wokwi (ESP32 + RC522 RFID) |

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` dan isi:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/admin
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/admin

# Neon PostgreSQL
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require

# Device API Key (untuk ESP32)
DEVICE_API_KEY=gate_utama_secret_key
```

### 3. Setup Database

```bash
# Push schema ke Neon
npm run db:push

# (Opsional) Buka Drizzle Studio
npm run db:studio
```

### 4. Seed Data (untuk development)

```bash
npm run db:seed
```

### 5. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

```bash
# Login ke Vercel
npx vercel login

# Deploy
npx vercel --prod
```

Set environment variables di Vercel Dashboard:
- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`
- `DEVICE_API_KEY`

## API Endpoints

```
POST /api/attendance/tap     → ESP32 kirim tap (public, device key)
GET  /api/attendance        → Dashboard query
PATCH /api/attendance/:id   → Guru override status
```

## Testing ESP32 Tap

```bash
curl -X POST http://localhost:3000/api/attendance/tap \
  -H "X-Device-Key: gate_utama_secret_key" \
  -H "Content-Type: application/json" \
  -d '{"rfid_uid":"A3:B4:C5:D6","device_id":"ESP32_GATE_UTAMA","timestamp":"2026-05-17T06:55:00+07:00"}'
```

## Aturan Bisnis

- **Present:** Tap 06:00–07:00 WIB
- **Late:** Tap 07:01–08:30 WIB
- **Di luar jam:** Tidak direkam
- **Duplikat < 5 menit:** Diabaikan server-side

## Test RFID UIDs

- `A3:B4:C5:D6` — Farhan Ramadhan (X MIPA 1)
- `11:22:33:44` — Aisyah Putri (X MIPA 1)
- `AB:CD:EF:01` — Nanda Khoirul (XI MIPA 1)
- `A1:B2:C3:D4` — Intan Permata (XII MIPA 1)