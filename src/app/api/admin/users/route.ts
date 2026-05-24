/**
 * POST /api/admin/users
 * Buat user baru (admin/teacher/student)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { neon } from "@neondatabase/serverless";

const baseUserSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(255),
  email: z.string().email("Format email tidak valid").optional().nullable(),
  password: z.string().min(8, "Password minimal 8 karakter"),
  role: z.enum(["admin", "teacher", "student"]),
});

const studentUserSchema = baseUserSchema.extend({
  role: z.literal("student"),
  nis: z.string().min(1, "NIS wajib diisi").max(20),
  classId: z.string().uuid("ID kelas tidak valid").optional().nullable(),
  rfidUid: z.string().max(50).optional().nullable(),
});

const adminTeacherSchema = baseUserSchema.extend({
  role: z.enum(["admin", "teacher"]),
  email: z.string().email("Email wajib untuk admin/guru"),
});

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const { role } = body;

    let parsed;
    if (role === "student") {
      parsed = studentUserSchema.safeParse(body);
    } else {
      parsed = adminTeacherSchema.safeParse(body);
    }

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check duplicate email
    if (data.email) {
      const existingEmail = await db.execute(sql`
        SELECT id FROM users WHERE email = ${data.email} LIMIT 1
      `);
      if ((existingEmail as unknown as { rows: unknown[] }).rows.length > 0) {
        return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
      }
    }

    // Check duplicate NIS (for students)
    if (data.role === "student") {
      const existingNis = await db.execute(sql`
        SELECT id FROM students WHERE nis = ${data.nis} LIMIT 1
      `);
      if ((existingNis as unknown as { rows: unknown[] }).rows.length > 0) {
        return NextResponse.json({ error: "NIS sudah terdaftar" }, { status: 409 });
      }
    }

    // Check duplicate RFID
    if (data.role === "student" && data.rfidUid) {
      const existingRfid = await db.execute(sql`
        SELECT id FROM students WHERE rfid_uid = ${data.rfidUid} LIMIT 1
      `);
      if ((existingRfid as unknown as { rows: unknown[] }).rows.length > 0) {
        return NextResponse.json({ error: "RFID UID sudah terdaftar" }, { status: 409 });
      }
    }

    const passwordHash = await hashPassword(data.password);

    if (data.role === "student") {
      // Use transaction via raw SQL
      const dbSql = neon(process.env.DATABASE_URL!);
      const result = await dbSql`
        INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at)
        VALUES (${data.name}, ${data.email ?? null}, ${passwordHash}, 'student', true, NOW(), NOW())
        RETURNING id
      `;
      const userId = result[0]?.id;
      if (!userId) return NextResponse.json({ error: "Gagal membuat user" }, { status: 500 });

      await dbSql`
        INSERT INTO students (user_id, nis, class_id, rfid_uid, is_active, created_at)
        VALUES (${userId}, ${data.nis}, ${data.classId ?? null}, ${data.rfidUid ?? null}, true, NOW())
      `;

      return NextResponse.json({
        message: "Akun siswa dibuat",
        userId,
        nis: data.nis,
        temporaryPassword: data.password,
      }, { status: 201 });
    } else {
      // admin or teacher
      const result = await db.execute(sql`
        INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at)
        VALUES (${data.name}, ${data.email}, ${passwordHash}, ${data.role}, true, NOW(), NOW())
        RETURNING id
      `);
      const userId = (result as unknown as { rows: Record<string, unknown>[] }).rows[0]?.id;
      if (!userId) return NextResponse.json({ error: "Gagal membuat user" }, { status: 500 });

      return NextResponse.json({
        message: `Akun ${data.role} dibuat`,
        userId,
        temporaryPassword: data.password,
      }, { status: 201 });
    }
  } catch (error) {
    console.error("[POST /api/admin/users]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}