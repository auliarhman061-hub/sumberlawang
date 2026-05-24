import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const result = await db.execute(sql`
      SELECT id, name, grade, academic_year, teacher_id
      FROM classes
      ORDER BY grade ASC, name ASC
    `);

    return NextResponse.json((result as unknown as { rows: Array<Record<string, unknown>> }).rows);
  } catch (error) {
    console.error("[GET /api/classes] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}