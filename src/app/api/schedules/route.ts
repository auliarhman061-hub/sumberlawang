import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { schedules, subjects, classes, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  day: z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu"]),
  period: z.number().int().min(1).max(10),
  subjectId: z.string().uuid(),
  classId: z.string().uuid(),
  teacherId: z.string().uuid(),
  academicYear: z.string().min(1).max(10),
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
    const classId = searchParams.get("class_id") ?? "";
    const teacherId = searchParams.get("teacher_id") ?? "";
    const day = searchParams.get("day") ?? "";
    const academicYear = searchParams.get("academic_year") ?? "";

    const conditions = [];
    if (classId) conditions.push(sql`${schedules.classId} = ${classId}`);
    if (teacherId) conditions.push(sql`${schedules.teacherId} = ${teacherId}`);
    if (day) conditions.push(sql`${schedules.day} = ${day}::day`);
    if (academicYear) conditions.push(sql`${schedules.academicYear} = ${academicYear}`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db.execute(sql`
      SELECT
        sc.id, sc.day, sc.period, sc.academic_year,
        sub.id as subject_id, sub.name as subject_name, sub.abbreviation as subject_abbreviation,
        cls.id as class_id, cls.name as class_name, cls.grade as class_grade,
        u.id as teacher_id, u.name as teacher_name
      FROM schedules sc
      INNER JOIN subjects sub ON sc.subject_id = sub.id
      INNER JOIN classes cls ON sc.class_id = cls.id
      INNER JOIN users u ON sc.teacher_id = u.id
      ${whereClause ? sql`WHERE ${whereClause}` : sql``}
      ORDER BY sc.day ASC, sc.period ASC
    `);

    const rows = (result as unknown as { rows: Record<string, unknown>[] }).rows;
    return NextResponse.json({
      data: rows.map((row) => ({
        id: row.id,
        day: row.day,
        period: row.period,
        academicYear: row.academic_year,
        subject: {
          id: row.subject_id,
          name: row.subject_name,
          abbreviation: row.subject_abbreviation,
        },
        class: {
          id: row.class_id,
          name: row.class_name,
          grade: row.class_grade,
        },
        teacher: {
          id: row.teacher_id,
          name: row.teacher_name,
        },
      })),
      total: rows.length,
    });
  } catch (error) {
    console.error("[GET /api/schedules] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { day, period, subjectId, classId, teacherId, academicYear } = parsed.data;

    // Check unique constraint
    const existing = await db.execute(sql`
      SELECT id FROM schedules
      WHERE day = ${day}::day AND period = ${period}
        AND class_id = ${classId} AND academic_year = ${academicYear}
      LIMIT 1
    `);
    if ((existing as unknown as { rows: unknown[] }).rows.length > 0) {
      return NextResponse.json({ error: "Jadwal bentrok dengan jadwal yang sudah ada" }, { status: 409 });
    }

    await db.insert(schedules).values({
      day,
      period,
      subjectId,
      classId,
      teacherId,
      academicYear,
    });

    return NextResponse.json({ message: "Jadwal dibuat" }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/schedules] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}