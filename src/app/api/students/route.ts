import { NextRequest, NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";

const createStudentSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  nis: z.string().min(1).max(20),
  classId: z.string().uuid().optional().nullable(),
  rfidUid: z.string().max(50).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const authResult = await requireTeacherOrAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const classId = searchParams.get("class_id") ?? "";

    const searchCondition = search
      ? sql`AND (u.name LIKE ${"%" + search + "%"} OR s.nis LIKE ${"%" + search + "%"} OR s.rfid_uid LIKE ${"%" + search + "%"})`
      : sql``;

    const classCondition = classId ? sql`AND s.class_id = ${classId}` : sql``;

    const result = await db.execute(sql`
      SELECT
        s.id, s.nis, s.rfid_uid, s.is_active, s.class_id, s.created_at,
        u.id as user_id, u.name, u.email,
        c.id as class_id, c.name as class_name, c.grade as class_grade
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.is_active = true
      ${searchCondition}
      ${classCondition}
      ORDER BY u.name ASC
      LIMIT 100
    `);

    const rows = (result as unknown as { rows: Array<Record<string, unknown>> }).rows;

    const data = rows.map((row) => ({
      id: row.id,
      nis: row.nis,
      rfidUid: row.rfid_uid,
      isActive: row.is_active,
      classId: row.class_id,
      createdAt: row.created_at ? String(row.created_at) : null,
      user: row.name ? {
        id: row.user_id, name: row.name, email: row.email ?? null,
      } : null,
      class: row.class_id ? { id: row.class_id, name: row.class_name, grade: row.class_grade } : null,
    }));

    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    console.error("[GET /api/students] Error:", error);
    return NextResponse.json({ error: "Internal server error", detail: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireTeacherOrAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const parsed = createStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, email, nis, classId, rfidUid } = parsed.data;

    // Check duplicates
    if (email) {
      const existingEmail = await db.execute(sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`);
      if ((existingEmail as unknown as { rows: Array<Record<string, unknown>> }).rows.length > 0) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      }
    }

    const existingNis = await db.execute(sql`SELECT id FROM students WHERE nis = ${nis} LIMIT 1`);
    if ((existingNis as unknown as { rows: Array<Record<string, unknown>> }).rows.length > 0) {
      return NextResponse.json({ error: "NIS sudah terdaftar" }, { status: 409 });
    }

    if (rfidUid) {
      const existingRfid = await db.execute(sql`SELECT id FROM students WHERE rfid_uid = ${rfidUid} LIMIT 1`);
      if ((existingRfid as unknown as { rows: Array<Record<string, unknown>> }).rows.length > 0) {
        return NextResponse.json({ error: "RFID UID sudah terdaftar" }, { status: 409 });
      }
    }

    // Hash default password
    const tempPassword = "Siswa12345!";
    const passwordHash = await hashPassword(tempPassword);

    // Create user with password
    const userResult = await db.execute(sql`
      INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at)
      VALUES (${name}, ${email ?? null}, ${passwordHash}, 'student', true, NOW(), NOW())
      RETURNING id
    `);

    const userId = (userResult as unknown as { rows: Array<Record<string, unknown>> }).rows[0]?.id;
    if (!userId) return NextResponse.json({ error: "Gagal membuat user" }, { status: 500 });

    // Create student
    await db.execute(sql`
      INSERT INTO students (user_id, nis, class_id, rfid_uid, is_active, created_at)
      VALUES (${userId}, ${nis}, ${classId ?? null}, ${rfidUid ?? null}, true, NOW())
    `);

    return NextResponse.json({
      message: "Akun siswa dibuat",
      nis,
      temporary_password: tempPassword,
      instruction: "Berikan NIS dan password ke siswa untuk login.",
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/students] Error:", error);
    return NextResponse.json({ error: "Internal server error", detail: String(error) }, { status: 500 });
  }
}