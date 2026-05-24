import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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