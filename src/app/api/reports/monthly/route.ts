import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2099),
  class_id: z.string().optional(),
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
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    const { month, year, class_id } = parsed.data;
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

    // Monthly attendance per student
    const result = class_id
      ? await db.execute(sql`
          SELECT s.id as student_id, u.name as student_name, s.nis,
                 c.name as class_name,
                 al.status, COUNT(*) as cnt
          FROM students s
          LEFT JOIN users u ON s.user_id = u.id
          LEFT JOIN classes c ON s.class_id = c.id
          LEFT JOIN attendance_logs al ON al.student_id = s.id
            AND al.date >= ${startDate} AND al.date <= ${endDate}
          WHERE s.is_active = true AND s.class_id = ${class_id}
          GROUP BY s.id, u.name, s.nis, c.name, al.status
          ORDER BY u.name ASC
        `)
      : await db.execute(sql`
          SELECT s.id as student_id, u.name as student_name, s.nis,
                 c.name as class_name,
                 al.status, COUNT(*) as cnt
          FROM students s
          LEFT JOIN users u ON s.user_id = u.id
          LEFT JOIN classes c ON s.class_id = c.id
          LEFT JOIN attendance_logs al ON al.student_id = s.id
            AND al.date >= ${startDate} AND al.date <= ${endDate}
          WHERE s.is_active = true
          GROUP BY s.id, u.name, s.nis, c.name, al.status
          ORDER BY u.name ASC
        `);

    // Group by student
    const studentMap: Record<string, {
      studentId: string; name: string; nis: string; class: string;
      present: number; late: number; absent: number; total: number;
    }> = {};

    for (const row of (result as unknown as { rows: Array<Record<string, unknown>> }).rows) {
      const sid = String(row.student_id);
      if (!studentMap[sid]) {
        studentMap[sid] = {
          studentId: sid,
          name: String(row.student_name ?? "Unknown"),
          nis: String(row.nis ?? ""),
          class: String(row.class_name ?? "Unknown"),
          present: 0, late: 0, absent: 0, total: 0,
        };
      }
      const cnt = parseInt(String(row.cnt)) || 0;
      if (row.status === "present") studentMap[sid].present += cnt;
      else if (row.status === "late") studentMap[sid].late += cnt;
      else if (row.status === "absent") studentMap[sid].absent += cnt;
      studentMap[sid].total += cnt;
    }

    const summaries = Object.values(studentMap).map((s) => ({
      studentId: s.studentId,
      name: s.name,
      nis: s.nis,
      class: s.class,
      present: s.present,
      late: s.late,
      absent: s.absent,
      total: s.total,
      percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
    }));

    const totals = {
      totalStudents: summaries.length,
      avgAttendance: summaries.length > 0
        ? Math.round(summaries.reduce((a, s) => a + s.percentage, 0) / summaries.length)
        : 0,
      totalPresent: summaries.reduce((a, s) => a + s.present, 0),
      totalLate: summaries.reduce((a, s) => a + s.late, 0),
      totalAbsent: summaries.reduce((a, s) => a + s.absent, 0),
    };

    return NextResponse.json({ month, year, class_id: class_id ?? null, summaries, totals });
  } catch (error) {
    console.error("[GET /api/reports/monthly] Error:", error);
    return NextResponse.json({ error: "Internal server error", detail: String(error) }, { status: 500 });
  }
}