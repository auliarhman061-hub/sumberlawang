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
    const result = await db.execute(sql`
      SELECT id, name, location, is_active, last_ping, created_at
      FROM devices
      ORDER BY name ASC
    `);

    return NextResponse.json((result as unknown as { rows: Array<Record<string, unknown>> }).rows);
  } catch (error) {
    console.error("[GET /api/devices] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}