"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";

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

export default function StudentSchedulesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState("all");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/sign-in");
      return;
    }
    if (user && user.role !== "student") {
      router.push("/");
      return;
    }
    fetchSchedules();
  }, [user, authLoading]);

  async function fetchSchedules() {
    try {
      const res = await fetch("/api/schedules/my");
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Gagal memuat jadwal");
        return;
      }
      const data = await res.json();
      setSchedules(data.data ?? []);
    } catch {
      setError("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  const filtered = selectedDay === "all"
    ? schedules
    : schedules.filter((s) => s.day === selectedDay);

  const days = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-100 rounded-xl" />
        <div className="h-12 bg-slate-100 rounded-xl" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-white rounded-xl border border-slate-200" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
        <span className="material-symbols-outlined text-5xl text-rose-300 mb-3 block">error</span>
        <p className="text-sm font-semibold text-rose-600">{error}</p>
        <button onClick={fetchSchedules} className="mt-3 text-xs text-rose-500 underline">
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Jadwal Pelajaran</h2>
        <p className="text-sm text-slate-500 mt-1">
          {user?.name} — Tahun Ajaran {schedules[0]?.academicYear ?? "—"}
        </p>
      </div>

      {/* Day Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedDay("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
            selectedDay === "all"
              ? "bg-brand text-white"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Semua
        </button>
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              selectedDay === d
                ? "bg-brand text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {DAY_LABELS[d]}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Jadwal", value: schedules.length, icon: "calendar_today", color: "emerald" },
          { label: "Mata Pelajaran", value: new Set(schedules.map((s) => s.subject.id)).size, icon: "menu_book", color: "blue" },
          { label: "Hari Aktif", value: new Set(schedules.map((s) => s.day)).size, icon: "event", color: "amber" },
          { label: "Tahun Ajaran", value: schedules[0]?.academicYear ?? "—", icon: "school", color: "violet" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`material-symbols-outlined text-${stat.color}-400 text-base`} style={{ fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
              <span className="text-xs text-slate-500">{stat.label}</span>
            </div>
            <p className={`text-2xl font-extrabold text-${stat.color}-700`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Schedule List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-200 mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
          <p className="text-base font-semibold text-slate-500">
            {selectedDay === "all"
              ? "Jadwal belum tersedia"
              : `Belum ada jadwal untuk hari ${DAY_LABELS[selectedDay] ?? selectedDay}`}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Hubungi admin atau wali kelas untuk info jadwal.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-700">
              {selectedDay === "all" ? "Semua Jadwal" : `Jadwal Hari ${DAY_LABELS[selectedDay]}`}
              <span className="ml-2 text-slate-400 font-normal">({filtered.length} mata pelajaran)</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {[...filtered].sort((a, b) => {
              const dayOrder = days.indexOf(a.day) - days.indexOf(b.day);
              if (dayOrder !== 0) return dayOrder;
              return a.period - b.period;
            }).map((s) => (
              <div key={`${s.id}-${s.day}-${s.period}`} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50/60 transition-colors">
                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                  selectedDay === "all"
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-blue-50 border border-blue-200"
                }`}>
                  <span className={`text-xs font-bold ${
                    selectedDay === "all" ? "text-emerald-600" : "text-blue-600"
                  }`}>{DAY_LABELS[s.day]?.slice(0, 3).toUpperCase()}</span>
                  <span className={`text-xs font-extrabold ${
                    selectedDay === "all" ? "text-emerald-700" : "text-blue-700"
                  }`}>{s.period}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{s.subject.name}</p>
                  {s.subject.abbreviation && s.subject.name !== s.subject.abbreviation && (
                    <p className="text-xs text-slate-400">({s.subject.abbreviation})</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-500">{s.class.name}</p>
                  <p className="text-xs text-slate-400">{s.academicYear}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}