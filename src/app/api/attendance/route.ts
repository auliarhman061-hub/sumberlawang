import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { attendanceLogs, students, classes, users } from "@/lib/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  date: z.string().optional(),
  class_id: z.string().optional(),
  status: z.enum(["present", "late", "absent"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query params" }, { status: 400 });
    }

    const { date, status, limit } = parsed.data;
    const page = parsed.data.page ?? 1;
    const offset = (page - 1) * limit;
    const today = new Date().toISOString().split("T")[0];
    const targetDate = date ?? today;

    // Get user role from Clerk
    const { users: clerkUsers } = await clerkClient();
    const user = await clerkUsers.getUser(userId);
    const role = (user.publicMetadata?.role as string) ?? "student";

    // Build all where conditions
    const conditions = [eq(attendanceLogs.date, targetDate)];
    if (status) {
      conditions.push(eq(attendanceLogs.status, status));
    }

    // Execute query with all conditions
    const data = await db
      .select({
        id: attendanceLogs.id,
        tapTime: attendanceLogs.tapTime,
        status: attendanceLogs.status,
        notes: attendanceLogs.notes,
        date: attendanceLogs.date,
        studentId: students.id,
        studentName: users.name,
        nis: students.nis,
        className: classes.name,
      })
      .from(attendanceLogs)
      .innerJoin(students, eq(attendanceLogs.studentId, students.id))
      .innerJoin(users, eq(students.userId, users.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .where(and(...conditions))
      .orderBy(desc(attendanceLogs.tapTime))
      .limit(limit)
      .offset(offset);

    // Summary counts
    const summaryRaw = await db
      .select({ status: attendanceLogs.status, count: count() })
      .from(attendanceLogs)
      .where(eq(attendanceLogs.date, targetDate))
      .groupBy(attendanceLogs.status);

    const summary = {
      present: Number(summaryRaw.find((s) => s.status === "present")?.count ?? 0),
      late: Number(summaryRaw.find((s) => s.status === "late")?.count ?? 0),
      absent: Number(summaryRaw.find((s) => s.status === "absent")?.count ?? 0),
      total: summaryRaw.reduce((acc, s) => acc + Number(s.count), 0),
    };

    return NextResponse.json({ data, summary, page, limit });
  } catch (error) {
    console.error("Get attendance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}