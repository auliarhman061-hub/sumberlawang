import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = req.nextUrl;
    const role = searchParams.get("role") ?? "";

    const result = await db.query.users.findMany({
      where: role ? eq(users.role, role as "admin" | "teacher" | "student") : undefined,
      orderBy: (t, { asc }) => [asc(t.name)],
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/users] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}