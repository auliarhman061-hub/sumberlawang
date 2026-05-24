import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { schoolHours } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  lateThreshold: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  periods: z.number().int().min(1).max(12),
  periodMinutes: z.number().int().min(30).max(90),
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
    const result = await db.query.schoolHours.findFirst({ where: eq(schoolHours.id, 1) });
    if (!result) {
      // Return default if not exists
      return NextResponse.json({
        id: 1,
        openTime: "06:00",
        lateThreshold: "07:00",
        closeTime: "16:00",
        periods: 8,
        periodMinutes: 45,
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/school-hours] Error:", error);
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
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { openTime, lateThreshold, closeTime, periods, periodMinutes } = parsed.data;

    // Upsert (insert or update)
    const existing = await db.query.schoolHours.findFirst({ where: eq(schoolHours.id, 1) });
    if (existing) {
      await db.update(schoolHours)
        .set({ openTime, lateThreshold, closeTime, periods, periodMinutes, updatedAt: new Date(), updatedBy: userId })
        .where(eq(schoolHours.id, 1));
    } else {
      await db.insert(schoolHours).values({
        id: 1,
        openTime,
        lateThreshold,
        closeTime,
        periods,
        periodMinutes,
        updatedBy: userId,
      });
    }

    return NextResponse.json({ message: "Jam sekolah diperbarui" });
  } catch (error) {
    console.error("[POST /api/school-hours] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}