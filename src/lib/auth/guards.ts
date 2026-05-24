/**
 * Lentera Sumberlawang — Auth Guards
 * Use in API routes to protect endpoints
 */
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "./session";
import type { AuthUser, UserRole } from "./types";

/**
 * Get current authenticated user from session cookie.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(
  req: NextRequest
): Promise<AuthUser | null> {
  const session = await verifySession(req);
  return session?.user ?? null;
}

/**
 * Require authentication — returns 401 if not logged in.
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ user: AuthUser } | NextResponse> {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { user };
}

/**
 * Require specific role(s) — returns 403 if role not allowed.
 * Usage: const result = await requireRole(req, ["admin", "teacher"]);
 *         if (result instanceof NextResponse) return result;
 *         const { user } = result;
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: UserRole[]
): Promise<{ user: AuthUser } | NextResponse> {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!allowedRoles.includes(authResult.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return authResult;
}

/** Shortcut: require admin role */
export async function requireAdmin(req: NextRequest) {
  return requireRole(req, ["admin"]);
}

/** Shortcut: require admin or teacher role */
export async function requireTeacherOrAdmin(req: NextRequest) {
  return requireRole(req, ["admin", "teacher"]);
}

/** Shortcut: require student role */
export async function requireStudent(req: NextRequest) {
  return requireRole(req, ["student"]);
}