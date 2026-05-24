import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { absenceRequests } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  studentId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["izin", "sakit"]),
  reason: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = req.nextUrl;
    const date = searchParams.get("date") ?? "";
    const studentId = searchParams.get("student_id") ?? "";
    const status = searchParams.get("status") ?? "";

    const conditions = [];
    if (date) conditions.push(sql`${absenceRequests.date} = ${date}`);
    if (studentId) conditions.push(sql`${absenceRequests.studentId} = ${studentId}`);
    if (status) conditions.push(sql`${absenceRequests.status} = ${status}::absence_status`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db.execute(sql`
      SELECT
        ar.id, ar.date, ar.type, ar.reason, ar.status, ar.created_at,
        s.id as student_id, s.nis,
        u.id as user_id, u.name as student_name,
        req.id as requester_id, req.name as requester_name
      FROM absence_requests ar
      INNER JOIN students s ON ar.student_id = s.id
      INNER JOIN users u ON s.user_id = u.id
      INNER JOIN users req ON ar.requested_by = req.id
      ${whereClause ? sql`WHERE ${whereClause}` : sql``}
      ORDER BY ar.date DESC, ar.created_at DESC
      LIMIT 100
    `);

    const rows = (result as unknown as { rows: Record<string, unknown>[] }).rows;
    return NextResponse.json({
      data: rows.map((row) => ({
        id: row.id,
        date: row.date,
        type: row.type,
        reason: row.reason,
        status: row.status,
        createdAt: row.created_at,
        student: { id: row.student_id, nis: row.nis, name: row.student_name },
        requestedBy: { id: row.requester_id, name: row.requester_name },
      })),
      total: rows.length,
    });
  } catch (error) {
    console.error("[GET /api/absences] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { studentId, date, type, reason } = parsed.data;

    // Check duplicate
    const existing = await db.execute(sql`
      SELECT id FROM absence_requests
      WHERE student_id = ${studentId} AND date = ${date}
      LIMIT 1
    `);
    if ((existing as unknown as { rows: unknown[] }).rows.length > 0) {
      return NextResponse.json({ error: "Siswa sudah punya izin/sakit di tanggal ini" }, { status: 409 });
    }

    await db.insert(absenceRequests).values({
      studentId,
      date,
      type,
      reason: reason ?? null,
      requestedBy: user.id,
      status: "approved",
    });

    return NextResponse.json({ message: "Izin/sakit dibuat" }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/absences] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}