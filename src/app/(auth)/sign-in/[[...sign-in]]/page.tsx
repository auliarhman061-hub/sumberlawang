import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 relative overflow-hidden items-center justify-center">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] border border-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border border-white/5 rounded-full" />
        </div>

        {/* Watermark */}
        <div className="absolute bottom-10 right-10 opacity-[0.04]">
          <span className="material-symbols-outlined text-[240px] text-white select-none" style={{ fontVariationSettings: "'FILL' 1" }}>
            school
          </span>
        </div>

        {/* Content */}
        <div className="relative z-10 px-16 max-w-lg">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/20">
              <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                school
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white leading-tight">
                Akademik Portal
              </h1>
              <p className="text-slate-400 text-sm font-medium">SMAN 1 Sumberlawang</p>
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Sistem Presensi<br />
            <span className="text-emerald-400">Digital RFID</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed mb-12">
            Pantau kehadiran siswa secara real-time melalui gerbang RFID. Mudah, cepat, dan akurat.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {[
              { icon: "wifi", text: "Sinkronisasi real-time dengan ESP32" },
              { icon: "security", text: "Autentikasi via Clerk" },
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

      {/* Right Panel — Sign In Form */}
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
              Gunakan akun Clerk untuk login
            </p>
          </div>

          {/* Clerk component */}
          <SignIn />

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 mt-8">
            © 2026 SMAN 1 Sumberlawang. Seluruh hak dilindungi.
          </p>
        </div>
      </div>
    </div>
  );
}