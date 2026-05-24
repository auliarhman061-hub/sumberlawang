import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {

    const today = new Date().toISOString().split("T")[0];

    // Total students
    const totalResult = await db.execute(sql`SELECT COUNT(*) as cnt FROM students WHERE is_active = true`);
    const totalStudents = parseInt(
      String((totalResult as unknown as { rows: Array<Record<string, unknown>> }).rows[0]?.cnt ?? 0)
    ) || 0;

    // Today attendance
    const todayResult = await db.execute(sql`
      SELECT al.status, COUNT(*) as cnt
      FROM attendance_logs al
      INNER JOIN students s ON al.student_id = s.id
      WHERE al.date = ${today}
      GROUP BY al.status
    `);

    let present = 0;
    let late = 0;
    for (const row of (todayResult as unknown as { rows: Array<Record<string, unknown>> }).rows) {
      if (row.status === "present") present = parseInt(String(row.cnt)) || 0;
      if (row.status === "late") late = parseInt(String(row.cnt)) || 0;
    }
    const absent = Math.max(0, totalStudents - present - late);

    // Weekly data — last 7 days
    const sixDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0];

    const weekResult = await db.execute(sql`
      SELECT al.date, al.status, COUNT(*) as cnt
      FROM attendance_logs al
      INNER JOIN students s ON al.student_id = s.id
      WHERE al.date >= ${sixDaysAgo}
      GROUP BY al.date, al.status
      ORDER BY al.date ASC
    `);

    const weekMap: Record<string, { present: number; late: number; total: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().split("T")[0];
      weekMap[d] = { present: 0, late: 0, total: 0 };
    }

    for (const row of (weekResult as unknown as { rows: Array<Record<string, unknown>> }).rows) {
      const key = String(row.date);
      if (!weekMap[key]) weekMap[key] = { present: 0, late: 0, total: 0 };
      if (row.status === "present") weekMap[key].present += parseInt(String(row.cnt)) || 0;
      if (row.status === "late") weekMap[key].late += parseInt(String(row.cnt)) || 0;
    }

    const weekly = Object.entries(weekMap).map(([date, data]) => ({
      date,
      pct: data.total > 0
        ? Math.round(((data.present + data.late) / data.total) * 100)
        : 0,
    }));

    return NextResponse.json({ totalStudents, today: { present, late, absent }, weekly });
  } catch (error) {
    console.error("[GET /api/stats] Error:", error);
    return NextResponse.json({ error: "Internal server error", detail: String(error) }, { status: 500 });
  }
}