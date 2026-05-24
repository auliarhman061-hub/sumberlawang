/**
 * Seed Script Wokwi — Lentera Sumberlawang
 * Jalankan: npx tsx src/lib/db/seed-wokwi.ts
 *
 * Seed 5 siswa Wokwi + 1 device ESP32_WOKWI
 * UID format: TANPA titik dua (uppercase hex) — sesuai output uidToString()
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seedWokwi() {
  console.log("🌱 Seeding data Wokwi...\n");

  // 1. Seed Device ESP32_WOKWI
  console.log("📱 Inserting device ESP32_WOKWI...");
  await db.insert(schema.devices).values({
    id: "ESP32_WOKWI",
    name: "Gerbang Utama (Wokwi Simulator)",
    location: "Simulator Wokwi",
    apiKey: "gate_utama_secret_key",
    isActive: true,
  }).onConflictDoNothing();
  console.log("✅ Device ESP32_WOKWI inserted\n");

  // 2. Daftar siswa Wokwi (UID = hasil uidToString(), TANPA titik dua)
  const siswaWokwi = [
    { rfidUid: "01020304", nama: "Putri Wulandari"        },
    { rfidUid: "11223344", nama: "Septa DWI Cahyo"         },
    { rfidUid: "55667788", nama: "Yusuf Fakih Syamaidzar"   },
    { rfidUid: "AABBCCDD", nama: "Salsabila Hana Pradipta"  },
    { rfidUid: "C0FFEE99", nama: "Meilana Afif Mahmudi"     },
  ];

  console.log("👨‍🎓 Inserting students...");
  for (const s of siswaWokwi) {
    // Cek apakah student sudah ada
    const existing = await db.query.students.findFirst({
      where: (students, { eq }) => eq(students.rfidUid, s.rfidUid),
    });

    if (existing) {
      console.log(`  ⏭️  ${s.rfidUid} sudah ada (${s.nama})`);
      continue;
    }

    // Buat user
    const [user] = await db.insert(schema.users).values({
      clerkId: `wokwi_${s.rfidUid}`,
      name: s.nama,
      email: `wokwi_${s.rfidUid}@lentera.local`,
      role: "student",
    }).returning();

    // Get atau buat kelas X MIPA 1
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

    // Buat student
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