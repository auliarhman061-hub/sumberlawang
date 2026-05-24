/**
 * Lentera Sumberlawang — Custom Auth Middleware
 * Next.js 16 compatible: proxy pattern with custom session auth
 *
 * Public routes:
 *   /, /sign-in, /sign-up
 *   /api/auth/login, /api/auth/logout, /api/auth/me
 *   /api/attendance/tap (ESP32 device auth via X-Device-Key)
 *
 * Protected routes → redirect ke /sign-in jika belum login
 * Role-based access dilakukan per-route, bukan di middleware.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up"];

const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/attendance/tap",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname) || isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  // Verify session
  const session = await verifySession(request);

  if (!session) {
    // Not authenticated — redirect to sign-in, preserve intended destination
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Inject user info into request headers for downstream API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", session.user.id);
  requestHeaders.set("x-user-role", session.user.role);
  requestHeaders.set("x-user-name", session.user.name);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};