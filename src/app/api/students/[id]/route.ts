import { NextRequest, NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  nis: z.string().min(1).max(20).optional(),
  classId: z.string().uuid().nullable().optional(),
  rfidUid: z.string().max(50).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireTeacherOrAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { name, nis, classId, rfidUid, isActive } = parsed.data;

    const studentRows = await db.execute(sql`
      SELECT s.id, s.user_id FROM students s WHERE s.id = ${id} LIMIT 1
    `);
    const student = (studentRows as unknown as { rows: Array<Record<string, unknown>> }).rows[0];
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // Update user name if provided
    if (name && student.user_id) {
      await db.execute(sql`UPDATE users SET name = ${name} WHERE id = ${student.user_id}`);
    }

    // Update student fields
    if (nis !== undefined) await db.execute(sql`UPDATE students SET nis = ${nis} WHERE id = ${id}`);
    if (classId !== undefined) await db.execute(sql`UPDATE students SET class_id = ${classId} WHERE id = ${id}`);
    if (rfidUid !== undefined) await db.execute(sql`UPDATE students SET rfid_uid = ${rfidUid ?? null} WHERE id = ${id}`);
    if (isActive !== undefined) await db.execute(sql`UPDATE students SET is_active = ${isActive} WHERE id = ${id}`);

    // Fetch updated student
    const updatedRows = await db.execute(sql`
      SELECT s.id, s.nis, s.rfid_uid, s.is_active, s.class_id,
             u.name, u.email, c.name as class_name
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = ${id} LIMIT 1
    `);
    const updated = (updatedRows as unknown as { rows: Array<Record<string, unknown>> }).rows[0];

    return NextResponse.json({
      data: {
        id: updated.id, nis: updated.nis, rfidUid: updated.rfid_uid,
        isActive: updated.is_active, classId: updated.class_id,
        user: { name: updated.name, email: updated.email },
        class: updated.class_name ? { name: updated.class_name } : null,
      }
    });
  } catch (error) {
    console.error("[PATCH /api/students/:id] Error:", error);
    return NextResponse.json({ error: "Internal server error", detail: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireTeacherOrAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;

    const studentRows = await db.execute(sql`SELECT id FROM students WHERE id = ${id} LIMIT 1`);
    if ((studentRows as unknown as { rows: Array<Record<string, unknown>> }).rows.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Soft delete
    await db.execute(sql`UPDATE students SET is_active = false WHERE id = ${id}`);
    return NextResponse.json({ message: "Student deactivated" });
  } catch (error) {
    console.error("[DELETE /api/students/:id] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}