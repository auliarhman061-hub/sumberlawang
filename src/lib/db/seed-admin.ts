import "dotenv/config";
/**
 * Seed Admin — Lentera Sumberlawang
 * Jalankan: npx tsx src/lib/db/seed-admin.ts
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../auth/password";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seedAdmin() {
  console.log("🔐 Seeding admin & teacher accounts...");

  // Admin account
  const adminPasswordHash = await hashPassword("Admin12345!");

  // Check if admin already exists
  const existingAdmin = await db.query.users.findFirst({
    where: eq(schema.users.email, "admin@lentera.local"),
  });

  if (!existingAdmin) {
    const [admin] = await db.insert(schema.users).values({
      name: "Administrator",
      email: "admin@lentera.local",
      passwordHash: adminPasswordHash,
      role: "admin",
      isActive: true,
    }).returning();
    console.log("✅ Admin created:", admin.email);
  } else {
    console.log("⚠️  Admin already exists:", existingAdmin.email);
  }

  // Teacher account
  const teacherPasswordHash = await hashPassword("Guru12345!");

  const existingTeacher = await db.query.users.findFirst({
    where: eq(schema.users.email, "guru@lentera.local"),
  });

  if (!existingTeacher) {
    const [teacher] = await db.insert(schema.users).values({
      name: "Guru Testing",
      email: "guru@lentera.local",
      passwordHash: teacherPasswordHash,
      role: "teacher",
      isActive: true,
    }).returning();
    console.log("✅ Teacher created:", teacher.email);
  } else {
    console.log("⚠️  Teacher already exists:", existingTeacher.email);
  }

  console.log("\n✅ All auth accounts seeded.");
  console.log("\nLogin credentials:");
  console.log("  Admin:  admin@lentera.local / Admin12345!");
  console.log("  Guru:   guru@lentera.local / Guru12345!");
}

seedAdmin().catch(console.error);