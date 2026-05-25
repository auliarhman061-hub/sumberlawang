import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    // Student: get schedules by class
    if (user.role === "student") {
      // Find student record
      const studentResult = await db.execute(sql`
        SELECT id, class_id FROM students WHERE user_id = ${user.id} LIMIT 1
      `);
      const studentRows = (studentResult as unknown as { rows: Record<string, unknown>[] }).rows;

      if (studentRows.length === 0) {
        return NextResponse.json({
          data: [],
          message: "Anda belum terdaftar sebagai siswa.",
        });
      }

      const student = studentRows[0];
      if (!student.class_id) {
        return NextResponse.json({
          data: [],
          message: "Anda belum memiliki kelas. Hubungi admin.",
        });
      }

      // Get schedules for student's class
      const result = await db.execute(sql`
        SELECT
          sc.id, sc.day, sc.period, sc.academic_year,
          sub.id as subject_id, sub.name as subject_name, sub.abbreviation as subject_abbreviation,
          cls.id as class_id, cls.name as class_name, cls.grade as class_grade,
          u.id as teacher_id, u.name as teacher_name
        FROM schedules sc
        INNER JOIN subjects sub ON sc.subject_id = sub.id
        INNER JOIN classes cls ON sc.class_id = cls.id
        LEFT JOIN users u ON sc.teacher_id = u.id
        WHERE sc.class_id = ${student.class_id}
        ORDER BY sc.day ASC, sc.period ASC
      `);

      const rows = (result as unknown as { rows: Record<string, unknown>[] }).rows;
      return NextResponse.json({
        data: rows.map((row) => ({
          id: row.id, day: row.day, period: row.period, academicYear: row.academic_year,
          subject: { id: row.subject_id, name: row.subject_name, abbreviation: row.subject_abbreviation },
          class: { id: row.class_id, name: row.class_name, grade: row.class_grade },
          teacher: row.teacher_id ? { id: row.teacher_id, name: row.teacher_name } : null,
        })),
        total: rows.length,
      });
    }

    // Teacher: get own schedules
    if (user.role === "teacher") {
      const result = await db.execute(sql`
        SELECT
          sc.id, sc.day, sc.period, sc.academic_year,
          sub.id as subject_id, sub.name as subject_name, sub.abbreviation as subject_abbreviation,
          cls.id as class_id, cls.name as class_name, cls.grade as class_grade
        FROM schedules sc
        INNER JOIN subjects sub ON sc.subject_id = sub.id
        INNER JOIN classes cls ON sc.class_id = cls.id
        WHERE sc.teacher_id = ${user.id}
        ORDER BY sc.day ASC, sc.period ASC
      `);

      const rows = (result as unknown as { rows: Record<string, unknown>[] }).rows;
      return NextResponse.json({
        data: rows.map((row) => ({
          id: row.id, day: row.day, period: row.period, academicYear: row.academic_year,
          subject: { id: row.subject_id, name: row.subject_name, abbreviation: row.subject_abbreviation },
          class: { id: row.class_id, name: row.class_name, grade: row.class_grade },
        })),
        total: rows.length,
      });
    }

    // Admin: get all active schedules
    if (user.role === "admin") {
      const result = await db.execute(sql`
        SELECT
          sc.id, sc.day, sc.period, sc.academic_year,
          sub.id as subject_id, sub.name as subject_name, sub.abbreviation as subject_abbreviation,
          cls.id as class_id, cls.name as class_name, cls.grade as class_grade,
          u.id as teacher_id, u.name as teacher_name
        FROM schedules sc
        INNER JOIN subjects sub ON sc.subject_id = sub.id
        INNER JOIN classes cls ON sc.class_id = cls.id
        LEFT JOIN users u ON sc.teacher_id = u.id
        ORDER BY sc.day ASC, sc.period ASC
        LIMIT 200
      `);

      const rows = (result as unknown as { rows: Record<string, unknown>[] }).rows;
      return NextResponse.json({
        data: rows.map((row) => ({
          id: row.id, day: row.day, period: row.period, academicYear: row.academic_year,
          subject: { id: row.subject_id, name: row.subject_name, abbreviation: row.subject_abbreviation },
          class: { id: row.class_id, name: row.class_name, grade: row.class_grade },
          teacher: row.teacher_id ? { id: row.teacher_id, name: row.teacher_name } : null,
        })),
        total: rows.length,
      });
    }

    return NextResponse.json({ data: [], total: 0 });
  } catch (error) {
    console.error("[GET /api/schedules/my] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}