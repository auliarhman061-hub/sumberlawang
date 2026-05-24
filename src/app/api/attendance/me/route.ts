import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

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

    // Find student by userId (clerk user id)
    const studentRows = await db.execute(sql`
      SELECT id FROM students
      WHERE user_id = (
        SELECT id FROM users WHERE clerk_id = ${userId}
      )
      LIMIT 1
    `);

    const rows = (studentRows as unknown as { rows: Array<Record<string, unknown>> }).rows;
    if (rows.length === 0) {
      return NextResponse.json({
        recent: [],
        stats: { totalDays: 0, present: 0, late: 0, absent: 0, percentage: 0 },
      });
    }

    const studentId = rows[0].id;

    const logs = await db.execute(sql`
      SELECT al.id, al.tap_time, al.status, al.date
      FROM attendance_logs al
      WHERE al.student_id = ${studentId}
      ORDER BY al.tap_time DESC
      LIMIT 100
    `);

    const logRows = (logs as unknown as { rows: Array<Record<string, unknown>> }).rows;
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
        tapTime: row.tapTime,
        status: row.status,
        date: row.date,
      })),
      stats: {
        totalDays: total,
        present,
        late,
        absent,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("[GET /api/attendance/me] Error:", error);
    return NextResponse.json({ error: "Internal server error", detail: String(error) }, { status: 500 });
  }
}