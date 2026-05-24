/**
 * GET /api/auth/me
 * Ambil data user yang sedang login dari session
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
}