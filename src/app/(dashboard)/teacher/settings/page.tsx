"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";

export default function TeacherSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/sign-in"); return; }
    if (user && user.role === "student") { router.push("/"); return; }
  }, [user, authLoading]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/sign-in");
    router.refresh();
  }

  const roleLabel = user?.role === "admin" ? "Administrator" : user?.role === "teacher" ? "Guru" : "User";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Pengaturan</h2>
        <p className="text-sm text-slate-500 mt-1">Informasi akun Anda</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-700">Profil Akun</h3>
        </div>
        <div className="p-6 space-y-3">
          <ProfileRow label="Nama" value={user?.name ?? "—"} />
          <ProfileRow label="Email" value={user?.email ?? "—"} />
          <ProfileRow label="Role" value={roleLabel} />
          <ProfileRow label="Status" value="Aktif" />
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-amber-600 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
          <p className="text-sm font-bold text-amber-700">Info Akun Guru</p>
        </div>
        <p className="text-xs text-amber-600 leading-relaxed">
          Akun guru digunakan untuk mengakses portal pengajaran, melihat jadwal mengajar, dan mengelola rekapitulasi kehadiran siswa di kelas Anda.
        </p>
      </div>

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

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}