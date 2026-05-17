import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { attendanceLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["present", "late", "absent"]),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { status, notes } = parsed.data;

    // Get user role from Clerk
    const { users: clerkUsers } = await clerkClient();
    const user = await clerkUsers.getUser(userId);
    const role = (user.publicMetadata?.role as string) ?? "student";

    // Only teacher and admin can override
    if (role !== "teacher" && role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if attendance log exists
    const existing = await db.query.attendanceLogs.findFirst({
      where: eq(attendanceLogs.id, id),
      with: { student: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Attendance log not found" },
        { status: 404 }
      );
    }

    // Update the attendance
    await db
      .update(attendanceLogs)
      .set({
        status,
        notes: notes ?? null,
        overrideBy: userId,
        overrideAt: new Date(),
      })
      .where(eq(attendanceLogs.id, id));

    return NextResponse.json({
      message: "Attendance updated",
      id,
      status,
      notes,
      overrideBy: userId,
      overrideAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Override attendance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}