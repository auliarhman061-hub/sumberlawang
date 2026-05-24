import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

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
    const nis: string = body?.nis ?? "";

    if (!nis || typeof nis !== "string" || !nis.trim()) {
      return NextResponse.json({ error: "NIS wajib diisi" }, { status: 400 });
    }

    const trimmed = nis.trim();

    // Find student by NIS
    const studentRows = await db.execute(sql`
      SELECT s.id, s.rfid_uid, s.user_id, u.name
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.nis = ${trimmed}
      LIMIT 1
    `);

    const rows = (studentRows as unknown as { rows: Array<Record<string, unknown>> }).rows;
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "NIS tidak ditemukan. Pastikan NIS benar dan RFID sudah terdaftar." },
        { status: 404 }
      );
    }

    const student = rows[0] as Record<string, unknown>;

    // Already linked?
    if (student.user_id) {
      return NextResponse.json(
        { error: "Akun ini sudah terhubung dengan NIS lain." },
        { status: 409 }
      );
    }

    const userEmail = `wokwi_${trimmed}@lentera.local`;

    // Link student → update user_id on student record
    await db.execute(sql`
      UPDATE students SET user_id = ${userId} WHERE id = ${student.id}
    `);

    return NextResponse.json({
      message: "Akun berhasil terhubung dengan NIS " + trimmed,
      rfidUid: student.rfid_uid ?? null,
    });
  } catch (error) {
    console.error("[POST /api/students/link]", error);
    return NextResponse.json({ error: "Internal server error", detail: String(error) }, { status: 500 });
  }
}
