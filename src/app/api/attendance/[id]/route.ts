import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["present", "late", "absent"]),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { status, notes } = parsed.data;

    // Check if exists
    const existing = await db.execute(sql`SELECT id FROM attendance_logs WHERE id = ${id} LIMIT 1`);
    if ((existing as unknown as { rows: Array<Record<string, unknown>> }).rows.length === 0) {
      return NextResponse.json({ error: "Attendance log not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    await db.execute(sql`
      UPDATE attendance_logs
      SET status = ${status},
          notes = ${notes ?? null},
          override_by = ${userId},
          override_at = ${now}
      WHERE id = ${id}
    `);

    return NextResponse.json({ id, status, notes: notes ?? null, overrideBy: userId, overrideAt: now });
  } catch (error) {
    console.error("[PATCH /api/attendance/:id] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}