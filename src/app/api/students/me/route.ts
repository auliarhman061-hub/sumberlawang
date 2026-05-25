/**
 * GET /api/students/me
 * Ambil profil siswa yang sedang login
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const result = await db.execute(sql`
      SELECT
        s.id, s.nis, s.rfid_uid, s.class_id, s.is_active as student_is_active,
        u.id as user_id, u.name, u.email, u.role,
        c.name as class_name, c.grade as class_grade
      FROM students s
      INNER JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.user_id = ${user.id}
      LIMIT 1
    `);

    const rows = (result as unknown as { rows: Record<string, unknown>[] }).rows;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Anda belum terdaftar sebagai siswa" }, { status: 404 });
    }

    const row = rows[0];
    return NextResponse.json({
      id: row.id,
      nis: row.nis,
      classId: row.class_id,
      className: row.class_name,
      classGrade: row.class_grade,
      rfidUid: row.rfid_uid,
      isActive: row.student_is_active,
      user: {
        id: row.user_id,
        name: row.name,
        email: row.email,
        role: row.role,
      },
    });
  } catch (error) {
    console.error("[GET /api/students/me]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}