import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2099),
  class_id: z.string().uuid().optional(),
  subject_id: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = req.nextUrl;
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    const { month, year, class_id, subject_id } = parsed.data;
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

    // If subject_id is provided, filter by schedule (teacher teaching that subject)
    let scheduleFilter = "";
    if (subject_id) {
      scheduleFilter = `AND sc.subject_id = '${subject_id}'`;
    }

    // Attendance summary per student in a class, filtered by subject (teacher's subject)
    const result = await db.execute(sql`
      SELECT
        s.id as student_id,
        u.name as student_name,
        s.nis,
        c.id as class_id,
        c.name as class_name,
        sub.id as subject_id,
        sub.name as subject_name,
        COALESCE(SUM(CASE WHEN al.status = 'present' THEN 1 ELSE 0 END), 0) as present,
        COALESCE(SUM(CASE WHEN al.status = 'late' THEN 1 ELSE 0 END), 0) as late,
        COALESCE(SUM(CASE WHEN al.status = 'absent' THEN 1 ELSE 0 END), 0) as absent,
        COALESCE(SUM(CASE WHEN al.status = 'izin' THEN 1 ELSE 0 END), 0) as izin,
        COALESCE(SUM(CASE WHEN al.status = 'sakit' THEN 1 ELSE 0 END), 0) as sakit,
        COUNT(al.id) as total_records
      FROM students s
      INNER JOIN users u ON s.user_id = u.id
      INNER JOIN classes c ON s.class_id = c.id
      INNER JOIN schedules sc ON sc.class_id = s.class_id
      INNER JOIN subjects sub ON sc.subject_id = sub.id
      INNER JOIN users teacher ON sc.teacher_id = teacher.id
      LEFT JOIN attendance_logs al ON al.student_id = s.id
        AND al.date >= ${startDate} AND al.date <= ${endDate}
      WHERE s.is_active = true
        AND teacher.clerk_id = ${userId}
        ${sql.raw(scheduleFilter ? scheduleFilter : (class_id ? `AND s.class_id = '${class_id}'` : "AND 1=1"))}
      GROUP BY s.id, u.name, s.nis, c.id, c.name, sub.id, sub.name
      ORDER BY u.name ASC
    `);

    const rows = (result as unknown as { rows: Record<string, string | number>[] }).rows;

    const totals = rows.reduce(
      (acc: { present: number; late: number; absent: number; izin: number; sick: number }, row: Record<string, string | number>) => ({
        present: acc.present + Number(row.present),
        late: acc.late + Number(row.late),
        absent: acc.absent + Number(row.absent),
        izin: acc.izin + Number(row.izin),
        sick: acc.sick + Number(row.sakit),
      }),
      { present: 0, late: 0, absent: 0, izin: 0, sick: 0 }
    );

    const breakdown = rows.map((row) => {
      const total = Number(row.present) + Number(row.late) + Number(row.absent) + Number(row.izin) + Number(row.sakit);
      const pct = total > 0 ? Math.round(((Number(row.present) + Number(row.late)) / total) * 100) : 0;
      return {
        studentId: row.student_id,
        studentName: String(row.student_name ?? "Unknown"),
        nis: String(row.nis ?? ""),
        classId: row.class_id,
        className: String(row.class_name ?? ""),
        subjectId: row.subject_id,
        subjectName: String(row.subject_name ?? ""),
        present: Number(row.present),
        late: Number(row.late),
        absent: Number(row.absent),
        izin: Number(row.izin),
        sick: Number(row.sakit),
        total,
        percentage: pct,
      };
    });

    return NextResponse.json({
      month,
      year,
      classId: class_id ?? null,
      subjectId: subject_id ?? null,
      totals,
      breakdown,
    });
  } catch (error) {
    console.error("[GET /api/reports/teacher] Error:", error);
    return NextResponse.json({ error: "Internal server error", detail: String(error) }, { status: 500 });
  }
}