import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { students, devices, attendanceLogs, users, classes } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { z } from "zod";

const tapSchema = z.object({
  rfid_uid: z.string().min(1).max(50),
  device_id: z.string().min(1).max(50),
  timestamp: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = tapSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { rfid_uid, device_id, timestamp } = parsed.data;

    // 1. Validate device API key
    const deviceKey = req.headers.get("x-device-key")?.trim();
    const expectedKey = (process.env.DEVICE_API_KEY ?? "gate_utama_secret_key").trim();

    if (deviceKey !== expectedKey) {
      return NextResponse.json(
        { error: "Invalid device key", received: deviceKey },
        { status: 401 }
      );
    }

    // 2. Verify device exists and is active
    const device = await db.query.devices.findFirst({
      where: and(eq(devices.id, device_id), eq(devices.isActive, true)),
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found or inactive" }, { status: 404 });
    }

    // 3. Parse timestamp
    let tapTime: Date;
    try {
      tapTime = new Date(timestamp);
    } catch {
      return NextResponse.json({ error: "Invalid timestamp format" }, { status: 400 });
    }

    // Extract jam dari string WIB
    const timePart = timestamp.split("T")[1]?.split("+")[0] ?? "00:00:00";
    const hours = parseInt(timePart.split(":")[0], 10);
    const minutes = parseInt(timePart.split(":")[1] ?? "0", 10);
    const totalMinutes = hours * 60 + minutes;

    // 4. Determine status based on time
    // 06:00-07:00 WIB = present, di luar jam = selalu late
    const isWithinSchoolHours = totalMinutes >= 360 && totalMinutes <= 510;
    const status = (totalMinutes <= 420) ? "present" : "late";

    // 6. Find student by RFID UID
    const student = await db.query.students.findFirst({
      where: and(eq(students.rfidUid, rfid_uid), eq(students.isActive, true)),
    });

    if (!student) {
      return NextResponse.json({ error: "RFID not registered" }, { status: 404 });
    }

    // 7. Get student user info
    const studentUser = await db.query.users.findFirst({
      where: eq(users.id, student.userId),
    });

    // 8. Get class info if exists
    let className = "Unknown";
    if (student.classId) {
      const classData = await db.query.classes.findFirst({
        where: eq(classes.id, student.classId),
      });
      className = classData?.name ?? "Unknown";
    }

    // 9. Duplicate check (5 menit)
    const fiveMinutesAgo = new Date(tapTime.getTime() - 5 * 60 * 1000);
    const existingLog = await db.query.attendanceLogs.findFirst({
      where: and(
        eq(attendanceLogs.studentId, student.id),
        gte(attendanceLogs.tapTime, fiveMinutesAgo)
      ),
    });

    if (existingLog) {
      return NextResponse.json({
        error: "Duplicate tap",
        message: `Tap sudah tercatat sebelumnya`,
      }, { status: 409 });
    }

    // 10. Insert attendance log
    const dateOnly = timestamp.split("T")[0];
    await db.insert(attendanceLogs).values({
      studentId: student.id,
      tapTime,
      status,
      deviceId: device_id,
      date: dateOnly,
    });

    // 11. Update device last_ping
    await db.update(devices).set({ lastPing: new Date() }).where(eq(devices.id, device_id));

    // 12. Return response
    return NextResponse.json({
      status,
      student_name: studentUser?.name ?? "Unknown",
      class: className,
      message: `${status === "present" ? "HADIR" : "TERLAMBAT"} - ${studentUser?.name ?? "Unknown"}`,
      tap_time: tapTime.toISOString(),
    });
  } catch (error) {
    console.error("[tap] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}