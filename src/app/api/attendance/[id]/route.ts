import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["present", "late", "absent"]),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { status, notes } = parsed.data;

    const existing = await db.execute(sql`SELECT id FROM attendance_logs WHERE id = ${id} LIMIT 1`);
    if ((existing as unknown as { rows: Array<Record<string, unknown>> }).rows.length === 0) {
      return NextResponse.json({ error: "Attendance log not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    await db.execute(sql`
      UPDATE attendance_logs
      SET status = ${status}, notes = ${notes ?? null},
          override_by = ${user.id}, override_at = ${now}
      WHERE id = ${id}
    `);

    return NextResponse.json({ id, status, notes: notes ?? null, overrideBy: user.id, overrideAt: now });
  } catch (error) {
    console.error("[PATCH /api/attendance/:id] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}