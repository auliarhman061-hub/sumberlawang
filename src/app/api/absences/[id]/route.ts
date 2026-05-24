import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { absenceRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  type: z.enum(["izin", "sakit"]).optional(),
  reason: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const existing = await db.query.absenceRequests.findFirst({ where: eq(absenceRequests.id, id) });
    if (!existing) {
      return NextResponse.json({ error: "Izin/sakit tidak ditemukan" }, { status: 404 });
    }

    await db.update(absenceRequests).set(parsed.data).where(eq(absenceRequests.id, id));
    return NextResponse.json({ message: "Izin/sakit diperbarui" });
  } catch (error) {
    console.error("[PATCH /api/absences/:id] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const existing = await db.query.absenceRequests.findFirst({ where: eq(absenceRequests.id, id) });
    if (!existing) {
      return NextResponse.json({ error: "Izin/sakit tidak ditemukan" }, { status: 404 });
    }

    await db.delete(absenceRequests).where(eq(absenceRequests.id, id));
    return NextResponse.json({ message: "Izin/sakit dihapus" });
  } catch (error) {
    console.error("[DELETE /api/absences/:id] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}