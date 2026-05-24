/**
 * GET /api/admin/users/[id]
 * Detail user by ID
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { z } from "zod";

const patchUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().nullable(),
  role: z.enum(["admin", "teacher", "student"]).optional(),
  isActive: z.boolean().optional(),
  nis: z.string().min(1).max(20).optional(),
  classId: z.string().uuid().nullable().optional(),
  rfidUid: z.string().max(50).nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;

    const result = await db.execute(sql`
      SELECT
        u.id, u.name, u.email, u.role, u.is_active, u.created_at, u.updated_at,
        s.id as student_id, s.nis, s.class_id, s.rfid_uid, s.is_active as student_is_active,
        c.name as class_name, c.grade as class_grade
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE u.id = ${id}
      LIMIT 1
    `);

    const rows = (result as unknown as { rows: Record<string, unknown>[] }).rows;
    if (rows.length === 0) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const row = rows[0];
    const data = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...(row.student_id ? {
        student: {
          id: row.student_id,
          nis: row.nis,
          classId: row.class_id,
          className: row.class_name,
          classGrade: row.class_grade,
          rfidUid: row.rfid_uid,
          isActive: row.student_is_active,
        },
      } : {}),
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/admin/users/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user (name, email, role, isActive, nis, classId, rfidUid)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = patchUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Check user exists
    const existing = await db.execute(sql`SELECT id FROM users WHERE id = ${id} LIMIT 1`);
    if ((existing as unknown as { rows: unknown[] }).rows.length === 0) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    // Check duplicate email
    if (data.email !== undefined) {
      const dup = await db.execute(sql`SELECT id FROM users WHERE email = ${data.email} AND id != ${id} LIMIT 1`);
      if ((dup as unknown as { rows: unknown[] }).rows.length > 0) {
        return NextResponse.json({ error: "Email sudah digunakan user lain" }, { status: 409 });
      }
    }

    // Check duplicate NIS
    if (data.nis !== undefined) {
      const dup = await db.execute(sql`SELECT id FROM students WHERE nis = ${data.nis} AND user_id != ${id} LIMIT 1`);
      if ((dup as unknown as { rows: unknown[] }).rows.length > 0) {
        return NextResponse.json({ error: "NIS sudah digunakan siswa lain" }, { status: 409 });
      }
    }

    // Check duplicate RFID
    if (data.rfidUid !== undefined) {
      const dup = await db.execute(sql`SELECT id FROM students WHERE rfid_uid = ${data.rfidUid} AND user_id != ${id} LIMIT 1`);
      if ((dup as unknown as { rows: unknown[] }).rows.length > 0) {
        return NextResponse.json({ error: "RFID UID sudah digunakan siswa lain" }, { status: 409 });
      }
    }

    // Update user fields
    if (data.name !== undefined) {
      await db.execute(sql`UPDATE users SET name = ${data.name}, updated_at = NOW() WHERE id = ${id}`);
    }
    if (data.email !== undefined) {
      await db.execute(sql`UPDATE users SET email = ${data.email ?? null}, updated_at = NOW() WHERE id = ${id}`);
    }
    if (data.role !== undefined) {
      await db.execute(sql`UPDATE users SET role = ${data.role}, updated_at = NOW() WHERE id = ${id}`);
    }
    if (data.isActive !== undefined) {
      await db.execute(sql`UPDATE users SET is_active = ${data.isActive}, updated_at = NOW() WHERE id = ${id}`);
    }

    // Update student fields if role is student
    const studentCheck = await db.execute(sql`SELECT id FROM students WHERE user_id = ${id} LIMIT 1`);
    const hasStudent = (studentCheck as unknown as { rows: unknown[] }).rows.length > 0;

    if (hasStudent) {
      if (data.nis !== undefined) {
        await db.execute(sql`UPDATE students SET nis = ${data.nis} WHERE user_id = ${id}`);
      }
      if (data.classId !== undefined) {
        await db.execute(sql`UPDATE students SET class_id = ${data.classId ?? null} WHERE user_id = ${id}`);
      }
      if (data.rfidUid !== undefined) {
        await db.execute(sql`UPDATE students SET rfid_uid = ${data.rfidUid ?? null} WHERE user_id = ${id}`);
      }
      if (data.isActive !== undefined) {
        await db.execute(sql`UPDATE students SET is_active = ${data.isActive} WHERE user_id = ${id}`);
      }
    }

    return NextResponse.json({ message: "User diperbarui" });
  } catch (error) {
    console.error("[PATCH /api/admin/users/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}