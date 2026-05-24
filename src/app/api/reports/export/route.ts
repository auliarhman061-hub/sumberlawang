import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  type: z.enum(["attendance", "recap"]),
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2020).max(2099).optional(),
  class_id: z.string().uuid().optional(),
  format: z.enum(["csv"]).default("csv"),
});

function escapeCSV(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = req.nextUrl;
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    const { type, month, year, class_id } = parsed.data;

    if (type === "attendance") {
      if (!month || !year) {
        return NextResponse.json({ error: "month and year required" }, { status: 400 });
      }
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

      const result = await db.execute(sql`
        SELECT
          u.name as student_name,
          s.nis,
          c.name as class_name,
          al.date,
          al.status,
          al.tap_time,
          al.notes
        FROM attendance_logs al
        INNER JOIN students s ON al.student_id = s.id
        INNER JOIN users u ON s.user_id = u.id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE al.date >= ${startDate} AND al.date <= ${endDate}
          ${class_id ? sql`AND s.class_id = ${class_id}` : sql``}
        ORDER BY al.date ASC, u.name ASC
      `);

      const rows = (result as unknown as { rows: Record<string, string | number | null>[] }).rows;

      const csvHeader = "Nama,NIS,Kelas,Tanggal,Status,Waktu Tap,Keterangan";
      const csvRows = rows.map((row) => [
        escapeCSV(row.student_name),
        escapeCSV(row.nis),
        escapeCSV(row.class_name),
        escapeCSV(row.date),
        escapeCSV(row.status),
        escapeCSV(row.tap_time ? new Date(row.tap_time as string).toLocaleTimeString("id-ID") : ""),
        escapeCSV(row.notes),
      ].join(","));

      const csv = [csvHeader, ...csvRows].join("\n");
      const filename = `presensi_${year}_${String(month).padStart(2, "0")}.csv`;

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (type === "recap") {
      if (!month || !year) {
        return NextResponse.json({ error: "month and year required" }, { status: 400 });
      }
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

      const result = await db.execute(sql`
        SELECT
          u.name as student_name,
          s.nis,
          c.name as class_name,
          COALESCE(SUM(CASE WHEN al.status = 'present' THEN 1 ELSE 0 END), 0) as hadir,
          COALESCE(SUM(CASE WHEN al.status = 'late' THEN 1 ELSE 0 END), 0) as terlambat,
          COALESCE(SUM(CASE WHEN al.status = 'absent' THEN 1 ELSE 0 END), 0) as alpa,
          COALESCE(SUM(CASE WHEN al.status = 'izin' THEN 1 ELSE 0 END), 0) as izin,
          COALESCE(SUM(CASE WHEN al.status = 'sakit' THEN 1 ELSE 0 END), 0) as sakit
        FROM students s
        INNER JOIN users u ON s.user_id = u.id
        LEFT JOIN classes c ON s.class_id = c.id
        LEFT JOIN attendance_logs al ON al.student_id = s.id
          AND al.date >= ${startDate} AND al.date <= ${endDate}
        WHERE s.is_active = true
          ${class_id ? sql`AND s.class_id = ${class_id}` : sql``}
        GROUP BY s.id, u.name, s.nis, c.name
        ORDER BY u.name ASC
      `);

      const rows = (result as unknown as { rows: Record<string, string | number | null>[] }).rows;

      const csvHeader = "Nama,NIS,Kelas,Hadir,Terlambat,Alpa,Izin,Sakit,Persentase";
      const csvRows = rows.map((row) => {
        const hadir = Number(row.hadir);
        const terlambat = Number(row.terlambat);
        const alpa = Number(row.alpa);
        const izin = Number(row.izin);
        const sakit = Number(row.sakit);
        const total = hadir + terlambat + alpa + izin + sakit;
        const pct = total > 0 ? Math.round(((hadir + terlambat) / total) * 100) : 0;
        return [
          escapeCSV(row.student_name),
          escapeCSV(row.nis),
          escapeCSV(row.class_name),
          hadir,
          terlambat,
          alpa,
          izin,
          sakit,
          pct + "%",
        ].join(",");
      });

      const csv = [csvHeader, ...csvRows].join("\n");
      const filename = `rekap_${year}_${String(month).padStart(2, "0")}.csv`;

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (error) {
    console.error("[GET /api/reports/export] Error:", error);
    return NextResponse.json({ error: "Internal server error", detail: String(error) }, { status: 500 });
  }
}