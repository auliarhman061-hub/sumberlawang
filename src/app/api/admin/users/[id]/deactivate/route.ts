/**
 * PATCH /api/admin/users/[id]/deactivate
 * Nonaktifkan user dan student-nya jika ada
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;

    const existing = await db.execute(sql`SELECT id FROM users WHERE id = ${id} LIMIT 1`);
    if ((existing as unknown as { rows: unknown[] }).rows.length === 0) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    // Deactivate user
    await db.execute(sql`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ${id}`);

    // Deactivate student if exists
    await db.execute(sql`UPDATE students SET is_active = false WHERE user_id = ${id}`);

    return NextResponse.json({ message: "User dinonaktifkan" });
  } catch (error) {
    console.error("[PATCH /api/admin/users/:id/deactivate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}