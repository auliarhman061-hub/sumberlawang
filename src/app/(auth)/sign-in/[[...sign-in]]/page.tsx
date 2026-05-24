"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Login gagal");
        setLoading(false);
        return;
      }

      const data = await res.json();
      const role = data.user?.role ?? "student";

      // Redirect berdasarkan role
      let destination = "/sign-in";
      if (role === "admin") destination = "/admin";
      else if (role === "teacher") destination = "/teacher";
      else destination = "/student";

      if (redirect && redirect.startsWith("/")) {
        destination = redirect;
      }

      router.push(destination);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] border border-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border border-white/5 rounded-full" />
        </div>

        <div className="absolute bottom-10 right-10 opacity-[0.04]">
          <span className="material-symbols-outlined text-[240px] text-white select-none" style={{ fontVariationSettings: "'FILL' 1" }}>
            school
          </span>
        </div>

        <div className="relative z-10 px-16 max-w-lg">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/20">
              <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                school
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white leading-tight">Akademik Portal</h1>
              <p className="text-slate-400 text-sm font-medium">SMAN 1 Sumberlawang</p>
            </div>
          </div>

          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Sistem Presensi<br />
            <span className="text-emerald-400">Digital RFID</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed mb-12">
            Pantau kehadiran siswa secara real-time melalui gerbang RFID. Mudah, cepat, dan akurat.
          </p>

          <div className="space-y-4">
            {[
              { icon: "wifi", text: "Sinkronisasi real-time dengan ESP32" },
              { icon: "password", text: "Login dengan email atau NIS" },
              { icon: "analytics", text: "Laporan kehadiran otomatis" },
              { icon: "notifications", text: "Notifikasi otomatis" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-emerald-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {icon}
                  </span>
                </div>
                <p className="text-slate-300 text-sm font-medium">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                school
              </span>
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900">Akademik Portal</h1>
              <p className="text-xs text-slate-500">SMAN 1 Sumberlawang</p>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900">Masuk</h2>
            <p className="text-sm text-slate-500 mt-1">
              Masukkan email, NIS, atau kata sandi untuk login
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <p className="text-sm text-rose-600 font-medium">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email atau NIS
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@lentera.local atau 12345"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Kata Sandi
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memuat...
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-slate-100 rounded-xl">
            <p className="text-xs text-slate-500 font-medium">
              <strong>Admin:</strong> admin@lentera.local / Admin12345!
              <br />
              <strong>Guru:</strong> guru@lentera.local / Guru12345!
              <br />
              <strong>Siswa:</strong> NIS / Siswa12345!
            </p>
          </div>

          <p className="text-center text-xs text-slate-400 mt-8">
            © 2026 SMAN 1 Sumberlawang. Seluruh hak dilindungi.
          </p>
        </div>
      </div>
    </div>
  );
}