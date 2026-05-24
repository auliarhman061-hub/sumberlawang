import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { sql } from "drizzle-orm";

const createStudentSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  nis: z.string().min(1).max(20),
  classId: z.string().uuid().optional().nullable(),
  rfidUid: z.string().max(50).optional().nullable(),
});

export async function GET(req: NextRequest) {
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const classId = searchParams.get("class_id") ?? "";

    // Build query using Drizzle sql template
    const searchCondition = search
      ? sql`AND (u.name LIKE ${"%" + search + "%"} OR s.nis LIKE ${"%" + search + "%"} OR s.rfid_uid LIKE ${"%" + search + "%"})`
      : sql``;

    const classCondition = classId ? sql`AND s.class_id = ${classId}` : sql``;

    const result = await db.execute(sql`
      SELECT
        s.id, s.nis, s.rfid_uid, s.is_active, s.class_id, s.created_at,
        u.id as user_id, u.name, u.email, u.clerk_id,
        c.id as class_id, c.name as class_name, c.grade as class_grade
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.is_active = true
      ${searchCondition}
      ${classCondition}
      ORDER BY u.name ASC
      LIMIT 100
    `);

    const rows = (result as unknown as { rows: Array<Record<string, unknown>> }).rows;

    const data = rows.map((row) => ({
      id: row.id,
      nis: row.nis,
      rfidUid: row.rfid_uid,
      isActive: row.is_active,
      classId: row.class_id,
      createdAt: row.created_at ? String(row.created_at) : null,
      user: row.name ? {
        id: row.user_id,
        name: row.name,
        email: row.email,
        clerkId: row.clerk_id,
      } : null,
      class: row.class_id ? {
        id: row.class_id,
        name: row.class_name,
        grade: row.class_grade,
      } : null,
    }));

    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    console.error("[GET /api/students] Error:", error);
    return NextResponse.json({ error: "Internal server error", detail: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = createStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, email, nis, classId, rfidUid } = parsed.data;

    // Check duplicates
    const existingEmail = await db.execute(sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`);
    if ((existingEmail as unknown as { rows: Array<Record<string, unknown>> }).rows.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const existingNis = await db.execute(sql`SELECT id FROM students WHERE nis = ${nis} LIMIT 1`);
    if ((existingNis as unknown as { rows: Array<Record<string, unknown>> }).rows.length > 0) {
      return NextResponse.json({ error: "NIS already exists" }, { status: 409 });
    }

    if (rfidUid) {
      const existingRfid = await db.execute(sql`SELECT id FROM students WHERE rfid_uid = ${rfidUid} LIMIT 1`);
      if ((existingRfid as unknown as { rows: Array<Record<string, unknown>> }).rows.length > 0) {
        return NextResponse.json({ error: "RFID UID already registered" }, { status: 409 });
      }
    }

    // Create Clerk invitation → email dikirim langsung ke siswa
    const clerk = await clerkClient();
    await clerk.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { role: "student" },
      notify: true,
    });

    // Create user in DB (Clerk user dibuat saat siswa accept invitation)
    const userResult = await db.execute(sql`
      INSERT INTO users (clerk_id, name, email, role, created_at, updated_at)
      VALUES (NULL, ${name}, ${email}, 'student', NOW(), NOW())
      RETURNING id
    `);

    const userId2 = (userResult as unknown as { rows: Array<Record<string, unknown>> }).rows[0]?.id;
    if (!userId2) return NextResponse.json({ error: "Failed to create user record" }, { status: 500 });

    // Create student
    await db.execute(sql`
      INSERT INTO students (user_id, nis, class_id, rfid_uid, is_active, created_at)
      VALUES (${userId2}, ${nis}, ${classId ?? null}, ${rfidUid ?? null}, true, NOW())
    `);

    return NextResponse.json({
      message: "Student created",
      invitation_sent_to: email,
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/students] Error:", error);
    return NextResponse.json({ error: "Internal server error", detail: String(error) }, { status: 500 });
  }
}