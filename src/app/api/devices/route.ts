import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

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