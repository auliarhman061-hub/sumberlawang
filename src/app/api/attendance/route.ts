import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = req.nextUrl;
    const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
    const class_id = searchParams.get("class_id") ?? "";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

    // Total students
    const totalResult = class_id
      ? await db.execute(sql`
          SELECT COUNT(*) as cnt FROM students
          WHERE is_active = true AND class_id = ${class_id}
        `)
      : await db.execute(sql`
          SELECT COUNT(*) as cnt FROM students WHERE is_active = true
        `);
    const totalStudents = parseInt(
      String((totalResult as unknown as { rows: Array<Record<string, unknown>> }).rows[0]?.cnt ?? 0)
    ) || 0;

    // Attendance today
    const attendanceResult = class_id
      ? await db.execute(sql`
          SELECT al.status, COUNT(*) as cnt
          FROM attendance_logs al
          INNER JOIN students s ON al.student_id = s.id
          WHERE al.date = ${date} AND s.class_id = ${class_id}
          GROUP BY al.status
        `)
      : await db.execute(sql`
          SELECT al.status, COUNT(*) as cnt
          FROM attendance_logs al
          INNER JOIN students s ON al.student_id = s.id
          WHERE al.date = ${date}
          GROUP BY al.status
        `);

    let presentCount = 0;
    let lateCount = 0;
    for (const row of (attendanceResult as unknown as { rows: Array<Record<string, unknown>> }).rows) {
      if (row.status === "present") presentCount = parseInt(String(row.cnt)) || 0;
      if (row.status === "late") lateCount = parseInt(String(row.cnt)) || 0;
    }

    const absentCount = Math.max(0, totalStudents - presentCount - lateCount);

    // Data rows
    const rowsResult = class_id
      ? await db.execute(sql`
          SELECT al.id, al.tap_time, al.status, al.notes, al.date,
                 s.id as student_id, u.name as student_name, s.nis,
                 c.name as class_name, s.class_id
          FROM attendance_logs al
          INNER JOIN students s ON al.student_id = s.id
          INNER JOIN users u ON s.user_id = u.id
          LEFT JOIN classes c ON s.class_id = c.id
          WHERE al.date = ${date} AND s.class_id = ${class_id}
          ORDER BY al.tap_time DESC
          LIMIT ${limit}
        `)
      : await db.execute(sql`
          SELECT al.id, al.tap_time, al.status, al.notes, al.date,
                 s.id as student_id, u.name as student_name, s.nis,
                 c.name as class_name, s.class_id
          FROM attendance_logs al
          INNER JOIN students s ON al.student_id = s.id
          INNER JOIN users u ON s.user_id = u.id
          LEFT JOIN classes c ON s.class_id = c.id
          WHERE al.date = ${date}
          ORDER BY al.tap_time DESC
          LIMIT ${limit}
        `);

    const rows = (rowsResult as unknown as { rows: Array<Record<string, unknown>> }).rows;
    const data = rows.map((row) => ({
      id: row.id,
      tapTime: row.tap_time,
      status: row.status,
      notes: row.notes,
      date: row.date,
      studentId: row.student_id,
      studentName: row.student_name,
      nis: row.nis,
      className: row.class_name,
      classId: row.class_id,
    }));

    return NextResponse.json({
      data,
      summary: {
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        total: totalStudents,
        checkedIn: presentCount + lateCount,
      },
      limit,
    });
  } catch (error) {
    console.error("[GET /api/attendance] Error:", error);
    return NextResponse.json({ error: "Internal server error", detail: String(error) }, { status: 500 });
  }
}