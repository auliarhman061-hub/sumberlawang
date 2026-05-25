"use client";

import { useAuth } from "@/components/auth/AuthProvider";

const FAQ_ITEMS = [
  {
    q: "Bagaimana cara melakukan presensi RFID?",
    a: "Tempelkan kartu RFID Anda ke reader di gerbang sekolah. Data presensi akan tercatat otomatis dalam sistem.",
  },
  {
    q: "Jam berapa presensi dimulai?",
    a: "Presensi dibuka mulai pukul 06:00 hingga 08:30 WIB. Hadir tepat waktu sebelum pukul 07:00 WIB.",
  },
  {
    q: "Apa bedanya Hadir dan Terlambat?",
    a: "Hadir = tap antara pukul 06:00–07:00 WIB. Terlambat = tap setelah pukul 07:01 WIB.",
  },
  {
    q: "Apa yang harus dilakukan jika kartu RFID tidak terbaca?",
    a: "Segera laporkan ke guru BK atau administrator sekolah. Jangan mencoba tap berulang kali karena akan tercatat sebagai duplicate.",
  },
  {
    q: "Bagaimana jika data presensi saya tidak sesuai?",
    a: "Hubungi wali kelas atau administrator untuk perbaikan data presensi.",
  },
  {
    q: "Apakah presensi bisa dilakukan di luar jam sekolah?",
    a: "Presensi RFID hanya aktif di jam sekolah (06:00–08:30 WIB). Di luar jam tersebut, tap tidak akan tercatat.",
  },
  {
    q: "Apakah presensi otomatis tercatat saat tap di gerbang?",
    a: "Ya, setiap tap RFID akan langsung tercatat di sistem dan dapat dilihat di halaman dashboard siswa.",
  },
];

const CONTACTS = [
  { role: "Administrator Sekolah", name: "Admin", desc: "Pengaturan akun & data siswa" },
  { role: "Wali Kelas", name: "Guru BK", desc: "Presensi & izin sakit" },
];

export default function StudentHelpPage() {
  const { user, loading } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Bantuan</h2>
        <p className="text-sm text-slate-500 mt-1">Panduan penggunaan sistem presensi digital</p>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
            <span className="text-sm font-bold text-emerald-700">Jam Presensi</span>
          </div>
          <p className="text-xs text-emerald-600 leading-relaxed">
            <strong>Hadir:</strong> 06:00–07:00 WIB<br />
            <strong>Terlambat:</strong> 07:01–08:30 WIB
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-blue-600" style={{ fontVariationSettings: "'FILL' 1" }}>wifi</span>
            <span className="text-sm font-bold text-blue-700">Teknologi</span>
          </div>
          <p className="text-xs text-blue-600 leading-relaxed">
            Presensi menggunakan kartu RFID yang dipindai oleh reader ESP32 di gerbang sekolah.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-amber-600" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
            <span className="text-sm font-bold text-amber-700">Informasi</span>
          </div>
          <p className="text-xs text-amber-600 leading-relaxed">
            {user ? `Login sebagai: ${user.name}` : "Login menggunakan NIS dan password yang diberikan sekolah."}
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Cara Kerja Presensi RFID</h3>
        </div>
        <div className="p-6 space-y-4">
          {[
            { step: "1", icon: "wifi", title: "Tempel Kartu", desc: "Tempelkan kartu RFID ke reader di gerbang sekolah saat datang." },
            { step: "2", icon: "check_circle", title: "Pencatatan Otomatis", desc: "Data kehadiran langsung tercatat di sistem dalam hitungan detik." },
            { step: "3", icon: "analytics", title: "Pantau di Dashboard", desc: "Wali kelas dan admin dapat memantau kehadiran secara real-time." },
          ].map((item) => (
            <div key={item.step} className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Pertanyaan yang Sering Diajukan</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="px-6 py-4">
              <p className="text-sm font-semibold text-slate-800 mb-1">{item.q}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Kontak */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Kontak</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            Hubungi pihak sekolah jika mengalami kendala:
          </p>
          <div className="space-y-3">
            {CONTACTS.map((c) => (
              <div key={c.role} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-slate-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{c.role}</p>
                  <p className="text-xs text-slate-400">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}