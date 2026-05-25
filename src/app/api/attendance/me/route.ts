import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;
  const { searchParams } = req.nextUrl;
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30"), 100);

  try {
    // Find student by userId
    const studentRows = await db.execute(sql`
      SELECT id FROM students WHERE user_id = ${user.id} LIMIT 1
    `);

    const rows = (studentRows as unknown as { rows: Record<string, unknown>[] }).rows;
    if (rows.length === 0) {
      return NextResponse.json({
        recent: [],
        stats: { totalDays: 0, present: 0, late: 0, absent: 0, percentage: 0 },
      });
    }

    const studentId = rows[0].id;

    // Build date filter
    let dateFilter = "";
    const params: string[] = [];
    if (start && end) {
      dateFilter = `AND al.date >= '${start}' AND al.date <= '${end}'`;
    }

    const logs = await db.execute(sql`
      SELECT al.id, al.tap_time, al.status, al.date
      FROM attendance_logs al
      WHERE al.student_id = ${studentId}
        ${start && end ? sql`AND al.date >= ${start} AND al.date <= ${end}` : sql``}
      ORDER BY al.date DESC, al.tap_time DESC
      LIMIT ${limit}
    `);

    const logRows = (logs as unknown as { rows: Record<string, unknown>[] }).rows;
    let present = 0;
    let late = 0;
    let absent = 0;
    for (const row of logRows) {
      if (row.status === "present") present++;
      else if (row.status === "late") late++;
      else if (row.status === "absent") absent++;
    }
    const total = present + late + absent;

    return NextResponse.json({
      recent: logRows.map((row) => ({
        id: row.id,
        tapTime: row.tap_time,
        status: row.status,
        date: row.date,
      })),
      stats: {
        totalDays: total,
        present,
        late,
        absent,
        percentage: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("[GET /api/attendance/me] Error:", error);
    return NextResponse.json({ error: "Internal server error", detail: String(error) }, { status: 500 });
  }
}