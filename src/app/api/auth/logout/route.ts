/**
 * POST /api/auth/logout
 * Hapus session cookie
 */
import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: { "Set-Cookie": clearSessionCookie() },
  });
}