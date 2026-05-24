import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import { sql as sqlTag } from "drizzle-orm";
import { hashPassword } from "../auth/password";

const dbSql = neon(process.env.DATABASE_URL!);
const db = drizzle(dbSql, { schema });

async function seedWokwi() {
  console.log("🌱 Seeding/updating Wokwi data...\n");

  // 1. Seed/update Device ESP32_WOKWI
  console.log("📱 Upserting device ESP32_WOKWI...");
  const existingDevice = await db.query.devices.findFirst({
    where: (devices, { eq }) => eq(devices.id, "ESP32_WOKWI"),
  });
  if (!existingDevice) {
    await db.insert(schema.devices).values({
      id: "ESP32_WOKWI",
      name: "Gerbang Utama (Wokwi Simulator)",
      location: "Simulator Wokwi",
      apiKey: "gate_utama_secret_key",
      isActive: true,
    });
    console.log("  ✅ Device ESP32_WOKWI created\n");
  } else {
    console.log("  ⏭️  Device ESP32_WOKWI already exists\n");
  }

  // 2. Seed/update siswa Wokwi
  const siswaWokwi = [
    { rfidUid: "01020304", nama: "Putri Wulandari"         },
    { rfidUid: "11223344", nama: "Septa DWI Cahyo"          },
    { rfidUid: "55667788", nama: "Yusuf Fakih Syamaidzar"   },
    { rfidUid: "AABBCCDD", nama: "Salsabila Hana Pradipta"  },
    { rfidUid: "C0FFEE99", nama: "Meilana Afif Mahmudi"    },
  ];

  const defaultPassword = await hashPassword("Siswa12345!");
  console.log("👨‍🎓 Upserting students...");

  // Get or create class X MIPA 1
  let classRec = await db.query.classes.findFirst({
    where: (classes, { eq }) => eq(classes.name, "X MIPA 1"),
  });
  if (!classRec) {
    const [newClass] = await db.insert(schema.classes).values({
      name: "X MIPA 1",
      grade: 10,
      academicYear: "2025/2026",
    }).returning();
    classRec = newClass;
  }

  for (const s of siswaWokwi) {
    const existingStudent = await db.query.students.findFirst({
      where: (students, { eq }) => eq(students.rfidUid, s.rfidUid),
    });

    if (existingStudent) {
      // Update user password if needed — use raw SQL
      if (!existingStudent.userId) {
        console.log(`  ⏭️  ${s.rfidUid} no user linked yet`);
        continue;
      }
      const updateResult = await db.execute(sqlTag`
        UPDATE users
        SET password_hash = ${defaultPassword}, is_active = true
        WHERE id = ${existingStudent.userId}
          AND password_hash IS NULL
      `);
      const updated = ((updateResult as unknown as { rows: unknown[] }).rows as unknown[]).length;
      console.log(`  ⏭️  ${s.rfidUid} ${updated > 0 ? "→ password set" : "already has password"} (${s.nama})`);
      continue;
    }

    // Create user with password
    const [user] = await db.insert(schema.users).values({
      name: s.nama,
      email: `wokwi_${s.rfidUid}@lentera.local`,
      passwordHash: defaultPassword,
      role: "student",
      isActive: true,
    }).returning();

    // Create student
    await db.insert(schema.students).values({
      userId: user.id,
      nis: `WOKWI${s.rfidUid}`,
      classId: classRec.id,
      rfidUid: s.rfidUid,
      isActive: true,
    });

    console.log(`  ✅ ${s.rfidUid} -> ${s.nama}`);
  }

  console.log("\n🎉 Seed Wokwi selesai!");
  console.log("\nLogin credentials:");
  console.log("  Siswa: NIS / Siswa12345!");
  console.log("\nData RFID untuk testing di Wokwi:");
  console.log("  01020304 -> Putri Wulandari");
  console.log("  11223344 -> Septa DWI Cahyo");
  console.log("  55667788 -> Yusuf Fakih Syamaidzar");
  console.log("  AABBCCDD -> Salsabila Hana Pradipta");
  console.log("  C0FFEE99 -> Meilana Afif Mahmudi");
  console.log("\nEndpoint API:");
  console.log("  POST https://lentera-sumberlawang.vercel.app/api/attendance/tap");
  console.log("  Header: X-Device-Key = gate_utama_secret_key");
}

seedWokwi().catch(console.error);