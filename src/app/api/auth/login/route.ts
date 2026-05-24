/**
 * POST /api/auth/login
 * Login dengan email atau NIS + password
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, students } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const loginSchema = z.object({
  identifier: z.string().min(1, "Identifier wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { identifier, password } = parsed.data;

    // Cari user berdasarkan email ATAU NIS
    const isEmail = identifier.includes("@");
    let userRow: Record<string, unknown> | null = null;

    if (isEmail) {
      const result = await db.execute(sql`
        SELECT id, name, email, password_hash, role, is_active
        FROM users WHERE email = ${identifier.toLowerCase()} LIMIT 1
      `);
      const rows = (result as unknown as { rows: Record<string, unknown>[] }).rows;
      userRow = rows[0] ?? null;
    } else {
      // Cari berdasarkan NIS → join students
      const result = await db.execute(sql`
        SELECT u.id, u.name, u.email, u.password_hash, u.role, u.is_active
        FROM users u
        INNER JOIN students s ON s.user_id = u.id
        WHERE s.nis = ${identifier.trim()} LIMIT 1
      `);
      const rows = (result as unknown as { rows: Record<string, unknown>[] }).rows;
      userRow = rows[0] ?? null;
    }

    if (!userRow) {
      // Generic error — jangan bocorkan apakah email/NIS atau password yang salah
      return NextResponse.json(
        { error: "Identifier atau password salah" },
        { status: 401 }
      );
    }

    // Cek user aktif
    if (!userRow.is_active) {
      return NextResponse.json(
        { error: "Akun tidak aktif. Hubungi administrator." },
        { status: 403 }
      );
    }

    // Verifikasi password
    if (!userRow.password_hash) {
      return NextResponse.json(
        { error: "Akun belum disetel password. Hubungi administrator." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, String(userRow.password_hash));
    if (!valid) {
      return NextResponse.json(
        { error: "Identifier atau password salah" },
        { status: 401 }
      );
    }

    // Buat session
    const sessionCookie = await createSession(req, {
      id: String(userRow.id),
      name: String(userRow.name),
      email: String(userRow.email),
      role: String(userRow.role) as "admin" | "teacher" | "student",
      isActive: true,
    });

    return NextResponse.json(
      {
        user: {
          id: userRow.id,
          name: userRow.name,
          email: userRow.email,
          role: userRow.role,
        },
      },
      {
        status: 200,
        headers: { "Set-Cookie": sessionCookie },
      }
    );
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}