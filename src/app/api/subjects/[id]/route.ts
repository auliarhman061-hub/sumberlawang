import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { subjects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  abbreviation: z.string().max(20).optional().nullable(),
  type: z.enum(["wajib", "pilihan"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const existing = await db.query.subjects.findFirst({ where: eq(subjects.id, id) });
    if (!existing) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

    const [updated] = await db.update(subjects).set(parsed.data).where(eq(subjects.id, id)).returning();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/subjects/:id] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const existing = await db.query.subjects.findFirst({ where: eq(subjects.id, id) });
    if (!existing) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

    await db.delete(subjects).where(eq(subjects.id, id));
    return NextResponse.json({ message: "Mata pelajaran dihapus" });
  } catch (error) {
    console.error("[DELETE /api/subjects/:id] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}