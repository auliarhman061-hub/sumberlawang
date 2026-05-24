import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { z } from "zod";

const linkSchema = z.object({
  nis: z.string().min(1).max(20),
});

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const body = await req.json();
    const parsed = linkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { nis } = parsed.data;
    const trimmed = nis.trim();

    const studentRows = await db.execute(sql`
      SELECT s.id, s.rfid_uid, s.user_id, u.name
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.nis = ${trimmed}
      LIMIT 1
    `);

    const rows = (studentRows as unknown as { rows: Array<Record<string, unknown>> }).rows;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "NIS tidak ditemukan" }, { status: 404 });
    }

    const student = rows[0] as Record<string, unknown>;

    if (student.user_id) {
      return NextResponse.json({ error: "Akun ini sudah terhubung dengan NIS lain" }, { status: 409 });
    }

    // Link student → update user_id on student record
    await db.execute(sql`UPDATE students SET user_id = ${user.id} WHERE id = ${student.id}`);

    return NextResponse.json({
      message: "Akun berhasil terhubung dengan NIS " + trimmed,
      rfidUid: student.rfid_uid ?? null,
    });
  } catch (error) {
    console.error("[POST /api/students/link]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}