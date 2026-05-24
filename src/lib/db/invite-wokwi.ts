/**
 * Kirim Clerk Invitation untuk 5 siswa Wokwi
 * Setiap siswa dapat login dengan link undangan dari email fake mereka
 *
 * Karena email fake (@lentera.local), siswa dibuatkan akun Clerk DULU
 * dengan password sederhana, tanpa perlu verifikasi email.
 *
 * Jalankan: npx tsx src/lib/db/invite-wokwi.ts
 */

import "dotenv/config";
import { clerkClient } from "@clerk/nextjs/server";

const WOKWI_STUDENTS = [
  { rfidUid: "01020304", name: "Putri Wulandari",       email: "putri.wulandari@smansumber.sch.id"    },
  { rfidUid: "11223344", name: "Septa DWI Cahyo",       email: "septa.cahyo@smansumber.sch.id"     },
  { rfidUid: "55667788", name: "Yusuf Fakih Syamaidzar", email: "yusuf.syamaidzar@smansumber.sch.id" },
  { rfidUid: "AABBCCDD", name: "Salsabila Hana Pradipta", email: "salsabila.pradipta@smansumber.sch.id" },
  { rfidUid: "C0FFEE99", name: "Meilana Afif Mahmudi",   email: "meilana.mahmudi@smansumber.sch.id"   },
];

const DEFAULT_PASSWORD = "sekolah123";

async function main() {
  const clerk = await clerkClient();
  console.log("🚀 Mengirim undangan ke 5 siswa Wokwi...\n");

  for (const student of WOKWI_STUDENTS) {
    const nameParts = student.name.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || undefined;

    try {
      // 1. Create Clerk user with password (skip email verification)
      const newUser = await clerk.users.createUser({
        emailAddress: [student.email],
        firstName,
        lastName,
        publicMetadata: { role: "student" },
        password: DEFAULT_PASSWORD,
        skipPasswordChecks: true,
        skipPasswordRequirement: true,
      });

      console.log(`✅ Clerk account: ${student.email}`);
      console.log(`   Password: ${DEFAULT_PASSWORD}`);
      console.log(`   Clerk ID: ${newUser.id}`);
    } catch (err: unknown) {
      const e = err as { code?: string; errors?: Array<{ message?: string }> };
      if (e.code === "user_exists") {
        console.log(`⚠️  User exists: ${student.email}`);
      } else {
        console.log(`❌ Failed for ${student.name}: ${e.code ?? e}`);
        if (e.errors?.[0]?.message) {
          console.log(`   Detail: ${e.errors[0].message}`);
        }
      }
      continue;
    }
  }

  console.log("\n\n📋 Ringkasan kredensial (bagikan ke siswa):\n");
  for (const s of WOKWI_STUDENTS) {
    console.log(`  ${s.name.padEnd(25)} | ${s.email.padEnd(40)} | pw: ${DEFAULT_PASSWORD}`);
  }
  console.log(`\n💡 Siswa bisa login langsung dengan email + password di atas.`);
}

main().catch(console.error);
