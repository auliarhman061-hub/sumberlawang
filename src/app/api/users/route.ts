import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = req.nextUrl;
    const role = searchParams.get("role") ?? "";

    const result = await db.query.users.findMany({
      where: role ? eq(users.role, role as "admin" | "teacher" | "student") : undefined,
      orderBy: (t, { asc }) => [asc(t.name)],
    });

    // Never expose password hash
    return NextResponse.json(result.map((u) => ({ ...u, passwordHash: undefined })));
  } catch (error) {
    console.error("[GET /api/users] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}