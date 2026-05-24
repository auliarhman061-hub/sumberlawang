# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Lentera Sumberlawang** is a digital RFID-based attendance system for SMAN 1 Sumberlawang. Students tap RFID cards at school gates, and the system automatically records attendance with status (present/late/absent) based on time rules.

**Tech Stack:**
- Next.js 16 (App Router) + React 19
- Tailwind CSS 4
- Neon PostgreSQL + Drizzle ORM
- Custom session-based authentication (cookie + database sessions)
- ESP32 + RC522 RFID hardware (Wokwi simulation)
- Deployed on Vercel

## Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:generate      # Generate Drizzle migrations
npm run db:push          # Push schema to database
npm run db:studio        # Open Drizzle Studio
npm run db:seed          # Seed students, classes, devices, attendance
npm run db:seed-admin    # Seed admin & teacher accounts only
```

## Authentication Architecture

**Custom session-based auth** (Clerk has been fully replaced):

- **Session storage:** Database table `sessions` with token + expiry
- **Cookie:** `lentera_session` (HttpOnly, 7-day expiry)
- **Password hashing:** bcryptjs
- **Middleware:** `src/proxy.ts` — protects all routes except public paths
- **Guards:** `src/lib/auth/guards.ts` — `requireAuth()`, `requireRole()`, `requireAdmin()`, etc.
- **Client context:** `AuthProvider` + `useAuth()` hook

**Public routes:**
- `/`, `/sign-in`, `/sign-up`
- `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- `/api/attendance/tap` (ESP32 device auth via `X-Device-Key` header)

**Protected routes:**
- All other routes require valid session
- Role-based access enforced per API route using guards

**Login credentials (seed):**
- Admin: `admin@lentera.local` / `Admin12345!`
- Teacher: `guru@lentera.local` / `Guru12345!`
- Student: NIS (e.g., `10001`) / `Siswa12345!`

## Database Schema

**Core tables:**
- `users` — All users (admin/teacher/student), stores `passwordHash`, `role`, `isActive`
- `sessions` — Active login sessions (token, userId, expiresAt)
- `students` — Student profiles (userId, nis, classId, rfidUid)
- `classes` — School classes (name, grade, teacherId, academicYear)
- `attendance_logs` — RFID tap records (studentId, tapTime, status, deviceId, date)
- `devices` — RFID readers (id, name, location, apiKey, isActive)
- `schedules` — Class schedules (day, period, subjectId, classId, teacherId, academicYear)
- `subjects` — Subjects/courses (name, abbreviation, type)
- `absence_requests` — Student absence requests (studentId, date, type, status)
- `school_hours` — School time settings (openTime, lateThreshold, closeTime)

**Key relationships:**
- `students.userId` → `users.id` (one-to-one)
- `students.classId` → `classes.id`
- `classes.teacherId` → `users.id` (homeroom teacher)
- `schedules.teacherId` → `users.id` (subject teacher)
- `schedules.classId` → `classes.id`
- `schedules.subjectId` → `subjects.id`
- `attendance_logs.studentId` → `students.id`

## Attendance Business Rules

**Time-based status:**
- **Present:** Tap between 06:00–07:00 WIB
- **Late:** Tap between 07:01–08:30 WIB
- **Outside hours:** Tap ignored (not recorded)

**Duplicate prevention:**
- Server-side: Ignore taps within 5 minutes of previous tap for same student

**Absence override:**
- If student has approved `absence_rin/sakit) for the day, tap returns that status instead of recording attendance

**Device authentication:**
- ESP32 devices authenticate via `X-Device-Key` header
- Key validated against `devices.apiKey` in database
- Device must be `isActive = true`

## API Architecture

**Endpoint patterns:**

```
/api/auth/*              — Authentication (login, logout, me)
/api/attendance/*        — Attendance logs (CRUD, tap endpoint)
/api/students/*          — Student management
/api/schedules/*         — Schedule management
/api/reports/*           — Reports & analytics
/api/admin/users/*       — User management (admonly)
```

**Common patterns:**
- Use `requireAuth(req)` or `requireRole(req, ["admin", "teacher"])` at start of API routes
- Return `NextResponse.json()` for all responses
- Use raw SQL via `db.execute(sql`...`)` for complex queries
- Use Drizzle query builder for simple CRUD

**Student schedule endpoint:**
- `GET /api/schedules/my` — Returns schedules for current user
  - For students: finds `students.userId`, then returns schedules for `students.classId`
  - For teachers: returns schedules where `schedules.teacherId = user.id`

**Student attendance endpoint:**
- `GET /api/attendance/me` — Returns attendance logs for current student
  - Finds `students.userId`, then queries `attendance_logs` for that `studentId`
  - Supports `?start=YYYY-MM-DD&end=YYYY-MM-DD` date range
  - Returns `recent` array and `stats` object (present, late, absent, percentage)

## Dashboard Routes

**Admin:** `/admin/*`
- Dashboard, students, schedules, reports, settings

**Teacher:** `/teacher/*`
- Dashboard, schedules, absence requests, recap (attendance reports), settings

**Student:** `/student/*`
- Dashboard, schedules, reports (recap), help, settings

**Navigation config:** `src/app/(dashboard)/layout.tsx` — defines nav items per role

**Important:** Student schedule route in nav is `/student/schedule` but actual page is at `/student/schedules/page.tsx` — there's a mismatch that should be fixed.

## Known Issues & Constraints

1. **Next.js 16 breaking changes:** This version differs from training data. Always check `node_modules/next/dist/docs/` before writing Next.js code.

2. **Schedule route mismatch:** Dashboard nav links to `/student/schedule` but page is at `/student/schedules` (with 's'). Fix nav or rename page.

3. **No Clerk:** All Clerk imports/usage have been removed. Do not suggest Clerk solutions.

4. **RFID tap endpoint must stay public:** `/api/attendance/tap` bypasses session auth and uses device key auth only.

5. **Seed idempotency:** Current seed script checks for existing devices and skips if found, but doesn't handle partial seeding well. Consider improving seed to be fully idempotent.

6. **Teacher-class relationship:** Teachers can be homeroom teachers (`classes.teacherId`) or subject teachers (`schedules.teacherId`). Recap reports use `schedules.teacherId` to determine which students a teacher can see.

7. **Student without class:** If `students.classId` is null, schedule and attendance features may break. Seed ensures all students have classes, but UI should handle this gracefully.

## Development Workflow

1. **Schema changes:**
   ```bash
   # Edit src/lib/db/schema.ts
   npm run db:push          # Push to database
   npm run db:seed          # Re-seed if needed
   ```

2. **Testing auth:**
   - Use seed credentials
   - Test all three roles (admin, teacher, student)
   - Verify role-based access control

3. **Testing RFID tap:**
   ```bash
   curl -X POST http://localhost:3000/api/attendance/tap \
     -H "X-Device-Key: gate_utama_secret_key" \
     -H "Content-Type: application/json" \
     -d '{"rfid_uid":"A3:B4:C5:D6","device_id":"ESP32_GATE_UTAMA","timestamp":"2026-05-25T06:55:00+07:00"}'
   ```

4. **Verifying build:**
   ```bash
   npm run lint
   npm run build
   ```

## Code Style

- Use TypeScript strict mode
- Client components: `"use client"` directive at top
- Server components: default (no directive)
- API routes: use `NextRequest` and `NextResponse`
- Database queries: prefer raw SQL for complex joins, Drizzle query builder for simple CRUD
- Auth guards: always check auth at start of API routes
- Error handling: return proper HTTP status codes (401, 403, 404, 500)
- Never return `passwordHash` in API responses

## Environment Variables

Required in `.env.local`:

```env
DATABASE_URL=postgresql://...          # Neon PostgreSQL connection string
DEVICE_API_KEY=gate_utama_secret_key   # ESP32 device authentication key
NODE_ENV=development                   # or production
```

## Deployment

Deployed on Vercel. Set environment variables in Vercel dashboard:
- `DATABASE_URL`
- `DEVICE_API_KEY`

Build command: `npm run build`
Output directory: `.next`

## Testing Accounts & Data

**Test RFID UIDs (from seed):**
- `A3:B4:C5:D6` — Farhan Ramadhan (NIS 10001, X MIPA 1)
- `11:22:33:44` — Aisyah Putri (NIS 10002, X MIPA 1)
- `AB:CD:EF:01` — Nanda Khoirul (NIS 11001, XI MIPA 1)
- `A1:B2:C3:D4` — Intan Permata (NIS 12001, XII MIPA 1)

**Test classes:**
- X MIPA 1 (grade 10)
- XI MIPA 1 (grade 11)
- XII MIPA 1 (grade 12)

**Test devices:**
- `ESP32_GATE_UTAMA` (key: `gate_utama_secret_key`)
- `ESP32_GATE_TIMUR` (key: `gate_timur_secret_key`)
