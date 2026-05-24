/**
 * Lentera Sumberlawang — Session Management
 * Token stored in DB + HTTP-only cookie
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import type { AuthUser } from "./types";

const COOKIE_NAME = "lentera_session";
const SESSION_DAYS = 7;

export interface SessionData {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  user: AuthUser;
}

/** Generate a secure random token */
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/** Create a new session for a user and return Set-Cookie header */
export async function createSession(
  req: NextRequest,
  user: AuthUser
): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    userId: user.id,
    token,
    expiresAt,
  });

  const cookieValue = `${user.id}:${token}`;
  return `${COOKIE_NAME}=${cookieValue}; HttpOnly; Path=/; Max-Age=${SESSION_DAYS * 86400}; SameSite=Lax${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

/** Verify a session from cookie, return session + user data or null */
export async function verifySession(
  req: NextRequest
): Promise<SessionData | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );

  const raw = cookies[COOKIE_NAME];
  if (!raw) return null;

  const colonIdx = raw.indexOf(":");
  if (colonIdx === -1) return null;
  const userId = raw.slice(0, colonIdx);
  const token = raw.slice(colonIdx + 1);

  // Look up session in DB
  const result = await db.execute(sql`
    SELECT
      sess.id,
      sess.user_id,
      sess.token,
      sess.expires_at,
      u.id as u_id,
      u.name,
      u.email,
      u.role,
      u.is_active
    FROM sessions sess
    INNER JOIN users u ON sess.user_id = u.id
    WHERE sess.user_id = ${userId}
      AND sess.token = ${token}
      AND sess.expires_at > NOW()
      AND u.is_active = true
    LIMIT 1
  `);

  const rows = (result as unknown as { rows: Record<string, unknown>[] }).rows;
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: String(row.id),
    userId: String(row.user_id),
    token: String(row.token),
    expiresAt: new Date(row.expires_at as string),
    user: {
      id: String(row.u_id),
      name: String(row.name),
      email: String(row.email),
      role: String(row.role) as AuthUser["role"],
      isActive: Boolean(row.is_active),
    },
  };
}

/** Build Set-Cookie header to clear the session */
export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

/** Delete a session from DB by userId + token */
export async function deleteSession(userId: string, token: string): Promise<void> {
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.token, token)));
}

/** Delete all sessions for a user (logout from all devices) */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}