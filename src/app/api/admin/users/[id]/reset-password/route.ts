/**
 * POST /api/admin/users/[id]/reset-password
 * Reset password user
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password minimal 8 karakter"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { password } = parsed.data;

    const existing = await db.execute(sql`SELECT id FROM users WHERE id = ${id} LIMIT 1`);
    if ((existing as unknown as { rows: unknown[] }).rows.length === 0) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const passwordHash = await hashPassword(password);

    await db.execute(sql`
      UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE id = ${id}
    `);

    return NextResponse.json({ message: "Password berhasil direset" });
  } catch (error) {
    console.error("[POST /api/admin/users/:id/reset-password]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}