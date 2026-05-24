"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

/* ── Nav config ──────────────────────────────────── */
const NAV: Record<string, { label: string; href: string; icon: string }[]> = {
  admin: [
    { label: "Dashboard",       href: "/admin",             icon: "dashboard" },
    { label: "Data Siswa",      href: "/admin/students",    icon: "group" },
    { label: "Jadwal",          href: "/admin/schedules",   icon: "calendar_today" },
    { label: "Laporan Bulanan", href: "/admin/reports",     icon: "description" },
    { label: "Pengaturan",      href: "/admin/settings",    icon: "settings" },
  ],
  teacher: [
    { label: "Dashboard",        href: "/teacher",           icon: "dashboard" },
    { label: "Jadwal Mengajar",  href: "/teacher/schedules", icon: "calendar_today" },
    { label: "Izin & Sakit",     href: "/teacher/absence",   icon: "event_available" },
    { label: "Rekapitulasi",     href: "/teacher/recap",     icon: "analytics" },
    { label: "Pengaturan",       href: "/teacher/settings",  icon: "settings" },
  ],
  student: [
    { label: "Dashboard",      href: "/student",           icon: "grid_view" },
    { label: "Jadwal",         href: "/student/schedule",  icon: "calendar_today" },
    { label: "Rekapitulasi",   href: "/student/reports",   icon: "analytics" },
    { label: "Bantuan",        href: "/student/help",      icon: "help_outline" },
    { label: "Pengaturan",     href: "/student/settings",  icon: "settings" },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  admin:   "Administrator",
  teacher: "Guru",
  student: "Siswa",
};

/* ── Avatar helper ───────────────────────────────── */
function UserAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
  const sizeClasses = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-12 w-12 text-sm",
  }[size];
  return (
    <div className={`${sizeClasses} rounded-full bg-brand flex items-center justify-center font-bold text-white`}>
      {initials}
    </div>
  );
}

/* ── Clock widget ────────────────────────────────── */
function ClockWidget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-brand-subtle rounded-xl border border-brand/10">
      <span className="material-symbols-outlined text-brand text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
        schedule
      </span>
      <div>
        <p className="text-xs font-bold text-brand leading-none">
          {format(now, "EEEE, d MMM", { locale: id })}
        </p>
        <p className="text-[10px] text-brand/60 font-medium leading-none mt-0.5">
          {format(now, "HH:mm")} WIB
        </p>
      </div>
    </div>
  );
}

/* ── Sidebar Nav Item ───────────────────────────── */
function NavItem({ item, active }: { item: { label: string; href: string; icon: string }; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 group
        ${active
          ? "bg-brand text-white shadow-sm"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        }`}
    >
      <span
        className="material-symbols-outlined text-lg transition-all"
        style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
      >
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

/* ── Logout Button ───────────────────────────────── */
function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/sign-in");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
    >
      <span className="material-symbols-outlined text-base">logout</span>
      {loading ? "Keluar..." : "Keluar"}
    </button>
  );
}

/* ── Layout ─────────────────────────────────────── */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Detect role from user or fallback to path
  const role = user?.role || (pathname.startsWith("/admin") ? "admin" : pathname.startsWith("/teacher") ? "teacher" : "student");
  const navItems = NAV[role] ?? NAV.student;
  const userName = user?.name || "Pengguna";

  const greeting =
    new Date().getHours() < 12 ? "Selamat Pagi"
    : new Date().getHours() < 18 ? "Selamat Siang"
    : "Selamat Malam";

  if (loading) {
 return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page flex">

      {/* ── Sidebar (desktop) ─────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed left-0 top-0 h-screen z-50 py-5">

        {/* Brand */}
        <div className="px-5 mb-7">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                school
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none">Akademik Portal</p>
              <p className="text-sm font-extrabold text-slate-800 leading-tight">SMAN 1<br />Sumberlawang</p>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg">
            <span className="dot-emerald dot-pulse" />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Sistem Aktif</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.href} item={item} active={pathname === item.href} />
          ))}
        </nav>

        {/* User card */}
        <div className="px-3 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <UserAvatar name={userName} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{userName}</p>
              <p className="text-[10px] text-slate-400">{ROLE_LABELS[role]}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────── */}
      <main className="flex-1 md:ml-64 min-h-screen pb-24 md:pb-8">

        {/* Top bar */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="flex justify-between items-center w-full px-4 md:px-8 py-3.5">
            {/* Left: hamburger + greeting */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-600">
                  {sidebarOpen ? "close" : "menu"}
                </span>
              </button>
              <div>
                <h1 className="text-base md:text-lg font-bold text-slate-800 leading-tight">
                  {greeting}, {userName}
                </h1>
                <p className="text-xs text-slate-400 hidden sm:block">
                  {format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
                </p>
              </div>
            </div>

            {/* Right: clock + notif */}
            <div className="flex items-center gap-2 md:gap-3">
              <ClockWidget />
              <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined text-slate-500 text-xl">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
              </button>
            </div>
          </div>
        </header>

        {/* ── Mobile sidebar overlay ────────────────── */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/30 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed top-0 left-0 h-full w-64 bg-white z-50 md:hidden py-5 flex flex-col shadow-xl">
              {/* Brand */}
              <div className="px-5 mb-7 flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none">Akademik Portal</p>
                    <p className="text-sm font-extrabold text-slate-800 leading-tight">SMAN 1<br />Sumberlawang</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-xl hover:bg-slate-100">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Nav */}
              <nav className="flex-1 px-3 space-y-1">
                {navItems.map((item) => (
                  <NavItem key={item.href} item={item} active={pathname === item.href} />
                ))}
              </nav>

              {/* User */}
              <div className="px-3 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <UserAvatar name={userName} size="sm" />
                  <div className="flex-1 min-w-0">
               <p className="text-sm font-semibold text-slate-800 truncate">{userName}</p>
                    <p className="text-[10px] text-slate-400">{ROLE_LABELS[role]}</p>
                  </div>
                  <LogoutButton />
                </div>
              </div>
            </aside>
          </>
        )}

        {/* Page content */}
        <div className="pt-4 px-4 md:px-8 pb-6">
          {children}
        </div>
      </main>

      {/* ── Bottom nav (mobile) ────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-50 flex justify-around items-center h-16 px-2 pb-5 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        {navItems.slice(0, 4).map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 transition-all ${
                active ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              <span
                className="material-symbols-outlined text-2xl"
                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-tighter leading-none">
                {item.label.split(" ")[0]}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}