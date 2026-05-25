"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";

interface StudentProfile {
  id: string;
  nis: string;
  classId: string | null;
  className: string | null;
  rfidUid: string | null;
  isActive: boolean;
  user: {
    id: string;
    name: string;
    email: string | null;
    role: string;
  };
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
      active
        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
        : "bg-rose-50 text-rose-700 border border-rose-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-rose-500"}`} />
      {active ? "Aktif" : "Tidak Aktif"}
    </span>
  );
}

export default function StudentSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/sign-in");
      return;
    }
    if (user?.role !== "student") {
      router.push("/");
      return;
    }
    fetchProfile();
  }, [user, authLoading]);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/students/me");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/sign-in");
    router.refresh();
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-100 rounded-xl" />
        <div className="h-32 bg-white rounded-2xl border border-slate-200" />
        <div className="h-48 bg-white rounded-2xl border border-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Pengaturan</h2>
        <p className="text-sm text-slate-500 mt-1">Profil dan informasi akun Anda</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-700">Profil Akun</h3>
        </div>
        <div className="p-6 space-y-4">
          <ProfileRow label="Nama" value={user?.name ?? "—"} />
          <ProfileRow label="Role" value={user?.role === "student" ? "Siswa" : user?.role ?? "—"} />
          <ProfileRow label="Email" value={user?.email ?? "Tidak ada"} />
          <ProfileRow label="NIS" value={profile?.nis ?? "—"} />
          <ProfileRow label="Kelas" value={profile?.className ?? "Belum punya kelas"} />
          <ProfileRow label="RFID UID" value={profile?.rfidUid ?? "Belum terdaftar"} mono />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-500">Status Akun</span>
            <StatusBadge active={profile?.isActive ?? true} />
          </div>
        </div>
      </div>

      {/* Attendance Info */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-700">Informasi Presensi</h3>
        </div>
        <div className="p-6 space-y-3">
          {[
            { icon: "schedule", label: "Jam Hadir", value: "06:00 – 07:00 WIB" },
            { icon: "schedule", label: "Jam Terlambat", value: "07:01 – 08:30 WIB" },
            { icon: "wifi", label: "Metode", value: "Kartu RFID otomatis" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-400 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
              <div className="flex-1">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="text-sm font-medium text-slate-800">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full py-3 bg-rose-50 border border-rose-200 text-rose-600 font-semibold rounded-xl hover:bg-rose-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>logout</span>
        {loggingOut ? "Keluar..." : "Keluar dari Akun"}
      </button>
    </div>
  );
}

function ProfileRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-medium text-slate-800 ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}