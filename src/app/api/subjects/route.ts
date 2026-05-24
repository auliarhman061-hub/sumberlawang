import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { subjects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  abbreviation: z.string().max(20).optional(),
  type: z.enum(["wajib", "pilihan"]).optional(),
});

export async function GET() {
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await db.query.subjects.findMany({
      orderBy: (t, { asc }) => [asc(t.name)],
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/subjects] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, abbreviation, type } = parsed.data;

    // Check duplicate name
    const existing = await db.query.subjects.findFirst({ where: eq(subjects.name, name) });
    if (existing) {
      return NextResponse.json({ error: "Mata pelajaran sudah ada" }, { status: 409 });
    }

    const [result] = await db.insert(subjects).values({
      name,
      abbreviation: abbreviation ?? null,
      type: type ?? "wajib",
    }).returning();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[POST /api/subjects] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}