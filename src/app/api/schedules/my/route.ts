import { NextRequest, NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const authResult = await requireTeacherOrAdmin(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    // Get teacher's own schedules using internal user ID
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
  } catch (error) {
    console.error("[GET /api/schedules/my] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}