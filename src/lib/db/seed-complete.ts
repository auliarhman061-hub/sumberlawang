import "dotenv/config";
/**
 * Complete Seed Script — Lentera Sumberlawang
 * Idempotent seed untuk semua tabel
 * Jalankan: npx tsx src/lib/db/seed-complete.ts
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "../auth/password";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seedComplete() {
  console.log("🌱 Starting complete seed...\n");

  // ========================================
  // 1. SEED ADMIN & TEACHER
  // ========================================
  console.log("🔐 Seeding admin & teacher accounts...");

  const adminPasswordHash = await hashPassword("Admin12345!");
  const teacherPasswordHash = await hashPassword("Guru12345!");

  let adminUser = await db.query.users.findFirst({
    where: eq(schema.users.email, "admin@lentera.local"),
  });
  if (!adminUser) {
    [adminUser] = await db.insert(schema.users).values({
      name: "Administrator",
      email: "admin@lentera.local",
      passwordHash: adminPasswordHash,
      role: "admin",
      isActive: true,
    }).returning();
    console.log("  ✅ Admin created");
  } else {
    console.log("  ⏭️  Admin exists");
  }

  let teacherUser = await db.query.users.findFirst({
    where: eq(schema.users.email, "guru@lentera.local"),
  });
  if (!teacherUser) {
    [teacherUser] = await db.insert(schema.users).values({
      name: "Guru Testing",
      email: "guru@lentera.local",
      passwordHash: teacherPasswordHash,
      role: "teacher",
      isActive: true,
    }).returning();
    console.log("  ✅ Teacher created");
  } else {
    console.log("  ⏭️  Teacher exists");
  }

  // ========================================
  // 2. SEED DEVICES
  // ========================================
  console.log("\n📱 Seeding devices...");

  const deviceData = [
    { id: "ESP32_GATE_UTAMA", name: "Gerbang Utama", location: "Pintu Utama Sekolah", apiKey: "gate_utama_secret_key" },
    { id: "ESP32_GATE_TIMUR", name: "Gerbang Timur", location: "Pintu Timur Sekolah", apiKey: "gate_timur_secret_key" },
  ];

  for (const dev of deviceData) {
    const existing = await db.query.devices.findFirst({ where: eq(schema.devices.id, dev.id) });
    if (!existing) {
      await db.insert(schema.devices).values({ ...dev, isActive: true });
      console.log(`  ✅ Device ${dev.id} created`);
    } else {
      console.log(`  ⏭️  Device ${dev.id} exists`);
    }
  }

  // ========================================
  // 3. SEED CLASSES (with teacherId)
  // ========================================
  console.log("\n🏫 Seeding classes...");

  const classData = [
    { name: "X MIPA 1", grade: 10, academicYear: "2025/2026" },
    { name: "XI MIPA 1", grade: 11, academicYear: "2025/2026" },
    { name: "XII MIPA 1", grade: 12, academicYear: "2025/2026" },
  ];

  const classResults: Array<{ id: string; name: string; grade: number; academicYear: string }> = [];

  for (const cls of classData) {
    let existing = await db.query.classes.findFirst({
      where: and(eq(schema.classes.name, cls.name), eq(schema.classes.academicYear, cls.academicYear)),
    });

    if (!existing) {
      [existing] = await db.insert(schema.classes).values({
        ...cls,
        teacherId: teacherUser.id, // Assign teacher as homeroom teacher
      }).returning();
      console.log(`  ✅ Class ${cls.name} created with teacher`);
    } else {
      // Update teacherId if null
      if (!existing.teacherId) {
        await db.update(schema.classes)
          .set({ teacherId: teacherUser.id })
          .where(eq(schema.classes.id, existing.id));
        console.log(`  ✅ Class ${cls.name} updated with teacher`);
      } else {
        console.log(`  ⏭️  Class ${cls.name} exists`);
      }
    }
    classResults.push(existing);
  }

  // ========================================
  // 4. SEED SUBJECTS
  // ========================================
  console.log("\n📚 Seeding subjects...");

  const subjectData = [
    { name: "Matematika", abbreviation: "MTK", type: "wajib" as const },
    { name: "Bahasa Indonesia", abbreviation: "BIN", type: "wajib" as const },
    { name: "Bahasa Inggris", abbreviation: "BIG", type: "wajib" as const },
    { name: "Fisika", abbreviation: "FIS", type: "wajib" as const },
    { name: "Kimia", abbreviation: "KIM", type: "wajib" as const },
    { name: "Biologi", abbreviation: "BIO", type: "wajib" as const },
    { name: "Pendidikan Agama", abbreviation: "PAI", type: "wajib" as const },
    { name: "PPKn", abbreviation: "PKN", type: "wajib" as const },
    { name: "Sejarah", abbreviation: "SEJ", type: "wajib" as const },
    { name: "PJOK", abbreviation: "PJK", type: "wajib" as const },
    { name: "Informatika", abbreviation: "INF", type: "wajib" as const },
  ];

  const subjectResults: Array<{ id: string; name: string; abbreviation: string | null }> = [];

  for (const subj of subjectData) {
    let existing = await db.query.subjects.findFirst({ where: eq(schema.subjects.name, subj.name) });
    if (!existing) {
      [existing] = await db.insert(schema.subjects).values(subj).returning();
      console.log(`  ✅ Subject ${subj.name} created`);
    } else {
      console.log(`  ⏭️  Subject ${subj.name} exists`);
    }
    subjectResults.push(existing);
  }

  // ========================================
  // 5. SEED SCHEDULES
  // ========================================
  console.log("\n📅 Seeding schedules...");

  const scheduleTemplate = [
    // Senin
    { day: "senin" as const, period: 1, subjectName: "Matematika" },
    { day: "senin" as const, period: 2, subjectName: "Bahasa Indonesia" },
    { day: "senin" as const, period: 3, subjectName: "Fisika" },
    { day: "senin" as const, period: 4, subjectName: "Informatika" },
    // Selasa
    { day: "selasa" as const, period: 1, subjectName: "Bahasa Inggris" },
    { day: "selasa" as const, period: 2, subjectName: "Kimia" },
    { day: "selasa" as const, period: 3, subjectName: "Biologi" },
    { day: "selasa" as const, period: 4, subjectName: "PPKn" },
    // Rabu
    { day: "rabu" as const, period: 1, subjectName: "Matematika" },
    { day: "rabu" as const, period: 2, subjectName: "Sejarah" },
    { day: "rabu" as const, period: 3, subjectName: "Bahasa Inggris" },
    { day: "rabu" as const, period: 4, subjectName: "PJOK" },
    // Kamis
    { day: "kamis" as const, period: 1, subjectName: "Kimia" },
    { day: "kamis" as const, period: 2, subjectName: "Biologi" },
    { day: "kamis" as const, period: 3, subjectName: "Pendidikan Agama" },
    { day: "kamis" as const, period: 4, subjectName: "Informatika" },
    // Jumat
    { day: "jumat" as const, period: 1, subjectName: "PPKn" },
    { day: "jumat" as const, period: 2, subjectName: "Bahasa Indonesia" },
    { day: "jumat" as const, period: 3, subjectName: "Pendidikan Agama" },
  ];

  let scheduleCount = 0;
  for (const cls of classResults) {
    for (const sched of scheduleTemplate) {
      const subject = subjectResults.find((s) => s.name === sched.subjectName);
      if (!subject) continue;

      const existing = await db.query.schedules.findFirst({
        where: and(
          eq(schema.schedules.day, sched.day),
          eq(schema.schedules.period, sched.period),
          eq(schema.schedules.classId, cls.id),
          eq(schema.schedules.academicYear, cls.academicYear)
        ),
      });

      if (!existing) {
        await db.insert(schema.schedules).values({
          day: sched.day,
          period: sched.period,
          subjectId: subject.id,
          classId: cls.id,
          teacherId: teacherUser.id,
          academicYear: cls.academicYear,
        });
        scheduleCount++;
      }
    }
  }
  console.log(`  ✅ ${scheduleCount} schedules created`);

  // ========================================
  // 6. SEED STUDENTS
  // ========================================
  console.log("\n👨‍🎓 Seeding students...");

  const studentData = [
    // X MIPA 1
    { nis: "10001", rfidUid: "A3:B4:C5:D6", name: "Farhan Ramadhan", classIndex: 0 },
    { nis: "10002", rfidUid: "11:22:33:44", name: "Aisyah Putri", classIndex: 0 },
    { nis: "10003", rfidUid: "AA:BB:CC:DD", name: "Reza Pratama", classIndex: 0 },
    { nis: "10004", rfidUid: "12:34:56:78", name: "Dina Marlina", classIndex: 0 },
    { nis: "10005", rfidUid: "FE:DC:BA:98", name: "Bagus Setiawan", classIndex: 0 },
    // XI MIPA 1
    { nis: "11001", rfidUid: "AB:CD:EF:01", name: "Nanda Khoirul", classIndex: 1 },
    { nis: "11002", rfidUid: "23:45:67:89", name: "Siti Nurhaliza", classIndex: 1 },
    { nis: "11003", rfidUid: "98:76:54:32", name: "Ahmad Fauzi", classIndex: 1 },
    { nis: "11004", rfidUid: "11:AA:22:BB", name: "Putri Melinda", classIndex: 1 },
    { nis: "11005", rfidUid: "CC:DD:EE:FF", name: "Rizki Ramadhan", classIndex: 1 },
    // XII MIPA 1
    { nis: "12001", rfidUid: "A1:B2:C3:D4", name: "Intan Permata", classIndex: 2 },
    { nis: "12002", rfidUid: "DE:AD:BE:EF", name: "Fajar Nugroho", classIndex: 2 },
    { nis: "12003", rfidUid: "CA:FE:BA:BE", name: "Maya Sari", classIndex: 2 },
    { nis: "12004", rfidUid: "01:02:03:04", name: "Dimas Arya", classIndex: 2 },
    { nis: "12005", rfidUid: "05:06:07:08", name: "Lina Hartati", classIndex: 2 },
  ];

  const defaultPassword = await hashPassword("Siswa12345!");
  const studentRecords: Array<{ id: string; userId: string; nis: string }> = [];

  for (const stud of studentData) {
    let existingStudent = await db.query.students.findFirst({ where: eq(schema.students.nis, stud.nis) });

    if (!existingStudent) {
      const [user] = await db.insert(schema.users).values({
        name: stud.name,
        email: `siswa${stud.nis}@demo.local`,
        passwordHash: defaultPassword,
        role: "student",
        isActive: true,
      }).returning();

      [existingStudent] = await db.insert(schema.students).values({
        userId: user.id,
        nis: stud.nis,
        classId: classResults[stud.classIndex].id,
        rfidUid: stud.rfidUid,
        isActive: true,
      }).returning();

      console.log(`  ✅ Student ${stud.nis} - ${stud.name} created`);
    } else {
      console.log(`  ⏭️  Student ${stud.nis} exists`);
    }
    studentRecords.push(existingStudent);
  }

  // ========================================
  // 7. SEED ATTENDANCE (14 days history)
  // ========================================
  console.log("\n📋 Seeding attendance logs (14 days)...");

  const today = new Date();
  let attendanceCount = 0;

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split("T")[0];

    // Skip weekends
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    for (const student of studentRecords) {
      // Check if attendance already exists
      const existing = await db.query.attendanceLogs.findFirst({
        where: and(
          eq(schema.attendanceLogs.studentId, student.id),
          eq(schema.attendanceLogs.date, dateStr)
        ),
      });

      if (existing) continue;

      // Random status: 70% present, 20% late, 10% absent
      const rand = Math.random();
      let status: "present" | "late" | "absent";
      let hour: number;
      let minute: number;

      if (rand < 0.7) {
        status = "present";
        hour = 6;
        minute = Math.floor(Math.random() * 60);
      } else if (rand < 0.9) {
        status = "late";
        hour = 7;
        minute = Math.floor(Math.random() * 30);
      } else {
        status = "absent";
        hour = 0;
        minute = 0;
      }

      if (status !== "absent") {
        const tapTime = new Date(`${dateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+07:00`);

        await db.insert(schema.attendanceLogs).values({
          studentId: student.id,
          tapTime,
          status,
          deviceId: "ESP32_GATE_UTAMA",
          date: dateStr,
        });
        attendanceCount++;
      }
    }
  }
  console.log(`  ✅ ${attendanceCount} attendance logs created`);

  // ========================================
  // SUMMARY
  // ========================================
  console.log("\n🎉 Complete seed finished!\n");
  console.log("📊 Summary:");
  console.log(`  - Subjects: ${subjectResults.length}`);
  console.log(`  - Classes: ${classResults.length}`);
  console.log(`  - Students: ${studentRecords.length}`);
  console.log(`  - Schedules: ${scheduleCount} (across all classes)`);
  console.log(`  - Attendance: ${attendanceCount} logs (14 days)`);

  console.log("\n🔑 Login credentials:");
  console.log("  Admin:   admin@lentera.local / Admin12345!");
  console.log("  Guru:    guru@lentera.local / Guru12345!");
  console.log("  Siswa:   NIS / Siswa12345!");

  console.log("\n🏷️  Test RFID UIDs:");
  console.log("  - A3:B4:C5:D6 (Farhan Ramadhan - X MIPA 1)");
  console.log("  - 11:22:33:44 (Aisyah Putri - X MIPA 1)");
  console.log("  - AB:CD:EF:01 (Nanda Khoirul - XI MIPA 1)");
  console.log("  - A1:B2:C3:D4 (Intan Permata - XII MIPA 1)");
}

seedComplete().catch(console.error);
