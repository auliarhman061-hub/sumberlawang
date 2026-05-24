"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

const DAY_LABELS: Record<string, string> = {
  senin: "Senin", selasa: "Selasa", rabu: "Rabu",
  kamis: "Kamis", jumat: "Jumat", sabtu: "Sabtu",
};

interface Schedule {
  id: string;
  day: string;
  period: number;
  academicYear: string;
  subject: { id: string; name: string; abbreviation: string | null };
  class: { id: string; name: string; grade: number };
}

export default function TeacherSchedulesPage() {
  const { isLoaded } = useUser();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    fetchSchedules();
  }, [isLoaded]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/schedules/my");
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  const grouped: Record<string, Schedule[]> = {};
  for (const s of schedules) {
    if (!grouped[s.day]) grouped[s.day] = [];
    grouped[s.day].push(s);
  }

  const days = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
  const maxPeriod = Math.max(8, ...schedules.map((s) => s.period));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Jadwal Mengajar</h2>
        <p className="text-sm text-slate-500 mt-1">Jadwal pelajaran yang Anda ajar</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Jadwal</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{schedules.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mata Pelajaran</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">
            {new Set(schedules.map((s) => s.subject.id)).size}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kelas</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">
            {new Set(schedules.map((s) => s.class.id)).size}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hari Mengajar</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">
            {new Set(schedules.map((s) => s.day)).size}
          </p>
        </div>
      </div>

      {/* Grid View */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Jadwal Mingguan</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-400 w-16">Jam</th>
                {days.map((d) => (
                  <th key={d} className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-400 min-w-[120px]">
                    {DAY_LABELS[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: maxPeriod }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-4 py-3 text-center font-bold text-slate-600">{i + 1}</td>
                    {days.map((d) => (
                      <td key={d} className="px-4 py-3">
                        <div className="h-16 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                Array.from({ length: maxPeriod }).map((_, period) => (
                  <tr key={period} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-center font-bold text-slate-600">{period + 1}</td>
                    {days.map((day) => {
                      const schedule = grouped[day]?.find((s) => s.period === period + 1);
                      return (
                        <td key={day} className="px-4 py-3">
                          {schedule ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                              <p className="text-xs font-bold text-emerald-700 leading-tight">
                                {schedule.subject.abbreviation ?? schedule.subject.name}
                              </p>
                              <p className="text-xs text-emerald-600 mt-1">{schedule.class.name}</p>
                            </div>
                          ) : (
                            <div className="h-16 flex items-center justify-center">
                              <span className="text-xs text-slate-300">—</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* List View */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Daftar Jadwal</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Hari", "Jam ke", "Mata Pelajaran", "Kelas", "Tahun Ajaran"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-5xl text-slate-200">calendar_today</span>
                      <p className="text-sm font-semibold text-slate-400">Belum ada jadwal mengajar</p>
                    </div>
                  </td>
                </tr>
              ) : (
                [...schedules].sort((a, b) => {
                  const dayOrder = days.indexOf(a.day) - days.indexOf(b.day);
                  if (dayOrder !== 0) return dayOrder;
                  return a.period - b.period;
                }).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 text-sm font-semibold text-slate-700">
                      {DAY_LABELS[s.day] ?? s.day}
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-slate-600">{s.period}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-800">
                      {s.subject.name}
                      {s.subject.abbreviation && (
                        <span className="ml-2 text-xs text-slate-400">({s.subject.abbreviation})</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">{s.class.name}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{s.academicYear}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}