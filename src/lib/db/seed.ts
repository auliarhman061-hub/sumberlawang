import "dotenv/config";
/**
 * Seed Script — Lentera Sumberlawang
 * Jalankan: npx tsx src/lib/db/seed.ts
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("🌱 Starting seed...");

  // 1. Check if data already exists
  const existingDevices = await db.query.devices.findMany();
  if (existingDevices.length > 0) {
    console.log("⚠️  Data already exists. Skipping seed.");
    console.log("   Delete existing data manually to re-seed.");
    return;
  }

  // 2. Seed Devices
  console.log("📱 Seeding devices...");
  await db.insert(schema.devices).values([
    {
      id: "ESP32_GATE_UTAMA",
      name: "Gerbang Utama",
      location: "Pintu Utama Sekolah",
      apiKey: "gate_utama_secret_key",
      isActive: true,
    },
    {
      id: "ESP32_GATE_TIMUR",
      name: "Gerbang Timur",
      location: "Pintu Timur Sekolah",
      apiKey: "gate_timur_secret_key",
      isActive: true,
    },
  ]);
  console.log("✅ Devices seeded");

  // 3. Seed Classes
  console.log("🏫 Seeding classes...");
  const classResults = await db.insert(schema.classes).values([
    { name: "X MIPA 1", grade: 10, academicYear: "2025/2026" },
    { name: "XI MIPA 1", grade: 11, academicYear: "2025/2026" },
    { name: "XII MIPA 1", grade: 12, academicYear: "2025/2026" },
  ]).returning();

  console.log("✅ Classes seeded:", classResults.length);

  // 4. Seed Sample Students (tanpa Clerk ID untuk MVP testing)
  console.log("👨‍🎓 Seeding students...");

  const studentData = [
    // X MIPA 1
    { nis: "10001", rfidUid: "A3:B4:C5:D6", classIndex: 0 },
    { nis: "10002", rfidUid: "11:22:33:44", classIndex: 0 },
    { nis: "10003", rfidUid: "AA:BB:CC:DD", classIndex: 0 },
    { nis: "10004", rfidUid: "12:34:56:78", classIndex: 0 },
    { nis: "10005", rfidUid: "FE:DC:BA:98", classIndex: 0 },
    // XI MIPA 1
    { nis: "11001", rfidUid: "AB:CD:EF:01", classIndex: 1 },
    { nis: "11002", rfidUid: "23:45:67:89", classIndex: 1 },
    { nis: "11003", rfidUid: "98:76:54:32", classIndex: 1 },
    { nis: "11004", rfidUid: "11:AA:22:BB", classIndex: 1 },
    { nis: "11005", rfidUid: "CC:DD:EE:FF", classIndex: 1 },
    // XII MIPA 1
    { nis: "12001", rfidUid: "A1:B2:C3:D4", classIndex: 2 },
    { nis: "12002", rfidUid: "DE:AD:BE:EF", classIndex: 2 },
    { nis: "12003", rfidUid: "CA:FE:BA:BE", classIndex: 2 },
    { nis: "12004", rfidUid: "01:02:03:04", classIndex: 2 },
    { nis: "12005", rfidUid: "05:06:07:08", classIndex: 2 },
  ];

  const studentNames = [
    "Farhan Ramadhan", "Aisyah Putri", "Reza Pratama", "Dina Marlina", "Bagus Setiawan",
    "Nanda Khoirul", "Siti Nurhaliza", "Ahmad Fauzi", "Putri Melinda", "Rizki Ramadhan",
    "Intan Permata", "Fajar Nugroho", "Maya Sari", "Dimas Arya", "Lina Hartati",
  ];

  for (let i = 0; i < studentData.length; i++) {
    const { nis, rfidUid, classIndex } = studentData[i];

    // Create user
    const [user] = await db.insert(schema.users).values({
      clerkId: `demo_${nis}`,
      name: studentNames[i] ?? `Siswa ${nis}`,
      email: `siswa${nis}@demo.local`,
      role: "student",
    }).returning();

    // Create student
    await db.insert(schema.students).values({
      userId: user.id,
      nis,
      classId: classResults[classIndex].id,
      rfidUid,
      isActive: true,
    });
  }
  console.log("✅ Students seeded:", studentData.length);

  // 5. Seed Sample Attendance (yesterday & today)
  console.log("📋 Seeding attendance logs...");

  const allStudents = await db.query.students.findMany();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  for (const student of allStudents.slice(0, 8)) {
    // Today: random status
    const todayStatus = Math.random() > 0.2
      ? (Math.random() > 0.3 ? "present" : "late")
      : "absent";

    if (todayStatus !== "absent") {
      const hour = todayStatus === "present" ? 6 : 7;
      const minute = Math.floor(Math.random() * 30);
      const tapTime = new Date(`${today}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+07:00`);

      await db.insert(schema.attendanceLogs).values({
        studentId: student.id,
        tapTime,
        status: todayStatus,
        deviceId: "ESP32_GATE_UTAMA",
        date: today,
      });
    }

    // Yesterday: mostly present
    const yesterdayHour = 6;
    const tapTimeY = new Date(`${yesterday}T${String(yesterdayHour).padStart(2, "0")}:${String(Math.floor(Math.random() * 30)).padStart(2, "0")}:00+07:00`);

    await db.insert(schema.attendanceLogs).values({
      studentId: student.id,
      tapTime: tapTimeY,
      status: "present",
      deviceId: "ESP32_GATE_UTAMA",
      date: yesterday,
    });
  }
  console.log("✅ Attendance logs seeded");

  console.log("\n🎉 Seed completed!");
  console.log("\nTest RFID UIDs untuk testing:");
  console.log("  - A3:B4:C5:D6 (Farhan Ramadhan - X MIPA 1)");
  console.log("  - 11:22:33:44 (Aisyah Putri - X MIPA 1)");
  console.log("  - AB:CD:EF:01 (Nanda Khoirul - XI MIPA 1)");
  console.log("  - A1:B2:C3:D4 (Intan Permata - XII MIPA 1)");
}

seed().catch(console.error);