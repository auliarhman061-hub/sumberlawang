"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useState } from "react";

function LinkStep({ userId }: { userId: string }) {
  const [nis, setNis] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nis.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/students/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nis }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
      } else {
        setError(data.error ?? "Gagal menghubungkan akun");
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">Akun Terhubung!</h2>
          <p className="text-sm text-slate-500 mb-6">
            NIS <strong>{nis}</strong> berhasil terhubung. Buka portal siswa sekarang.
          </p>
          <a
            href="/student"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold text-sm hover:bg-emerald-600 transition-colors"
          >
            <span className="material-symbols-outlined text-base">dashboard</span>
            Buka Portal Siswa
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-2xl text-blue-600" style={{ fontVariationSettings: "'FILL' 1" }}>
              link
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Hubungkan Akun</h2>
          <p className="text-xs text-slate-400 mt-1">
            Masukkan NIS di kartu RFID untuk terhubung dengan data presensi
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Nomor Induk Siswa (NIS)
            </label>
            <input
              type="text"
              value={nis}
              onChange={(e) => setNis(e.target.value.toUpperCase())}
              placeholder="WOKWI01020304"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !nis.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                Menghubungkan...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">link</span>
                Hubungkan NIS Saya
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-400 mt-4">
          NIS ada di kartu RFID. Minta ke admin kalau belum tahu.
        </p>
      </div>
    </div>
  );
}

export default function OnboardingClient() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">progress_activity</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-2xl text-blue-600" style={{ fontVariationSettings: "'FILL' 1" }}>
              person_add
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">Daftar Akun Dulu</h2>
          <p className="text-sm text-slate-500 mb-6">
            Kamu perlu akun Clerk untuk mengakses portal siswa.
          </p>
          <a
            href="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            Daftar Sekarang
          </a>
        </div>
      </div>
    );
  }

  return <LinkStep userId={user.id} />;
}
