"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";

interface Student {
  id: string;
  nis: string;
  rfidUid: string | null;
  isActive: boolean;
  user: { id: string; name: string; email: string } | null;
  class: { id: string; name: string } | null;
}
interface Class { id: string; name: string; grade: number; }

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700", "bg-teal-100 text-teal-700",
];
const getAvatarStyle = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-6 py-4"><div className="h-4 w-48 rounded skeleton" /></td>
      <td className="px-6 py-4"><div className="h-4 w-24 rounded skeleton" /></td>
      <td className="px-6 py-4"><div className="h-4 w-20 rounded skeleton" /></td>
      <td className="px-6 py-4"><div className="h-4 w-32 rounded skeleton" /></td>
      <td className="px-6 py-4"><div className="h-5 w-16 rounded-full skeleton" /></td>
      <td className="px-6 py-4"><div className="h-8 w-20 rounded-lg skeleton ml-auto" /></td>
    </tr>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{value}</h3>
      </div>
    </div>
  );
}

function Modal({
  open, onClose, editing, form, setForm, classes, saving, onSave,
  invitationEmail,
}: {
  open: boolean; onClose: () => void; editing: Student | null;
  form: { name: string; email: string; nis: string; classId: string; rfidUid: string };
  setForm: (f: typeof form) => void;
  classes: Class[];
  saving: boolean;
  onSave: () => void;
  invitationEmail: string | null;
}) {
  if (!open) return null;

  // ── Success state: invitation sent ─────────────────────
  if (invitationEmail) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 pb-0 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-outlined text-3xl text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                  mail
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Undangan Terkirim!</h3>
              <p className="text-sm text-slate-500 mt-1">
                Email undangan telah dikirim ke:
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-900 rounded-xl p-4 text-center">
                <p className="text-xs font-mono text-emerald-400 break-all">{invitationEmail}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-base shrink-0 mt-0.5">info</span>
                  <div className="text-xs text-amber-700 space-y-1">
                    <p><strong>Siswa perlu:</strong></p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Buka email dan klik link undangan</li>
                      <li>Buat password akun sendiri</li>
                      <li>Login ke portal dengan akun barunya</li>
                    </ol>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">done</span>
                Selesai
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">
              {editing ? "Edit Siswa" : "Tambah Siswa Baru"}
            </h3>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
              <span className="material-symbols-outlined text-slate-500">close</span>
            </button>
          </div>
          <div className="p-6 space-y-4">
            {[
              { key: "name",  label: "Nama Lengkap", type: "text", placeholder: "Masukkan nama lengkap" },
              { key: "email", label: "Email", type: "email", placeholder: "email@sekolah.sch.id", disabled: !!editing },
              { key: "nis",   label: "NIS", type: "text", placeholder: "Nomor Induk Siswa" },
            ].map(({ key, label, type, placeholder, disabled }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
                <input
                  type={type}
                  value={(form as Record<string,string>)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  disabled={disabled}
                  placeholder={placeholder}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all disabled:opacity-60"
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kelas</label>
              <select
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
              >
                <option value="">— Pilih Kelas —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RFID UID</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300">contactless</span>
                <input
                  type="text"
                  value={form.rfidUid}
                  onChange={(e) => setForm({ ...form, rfidUid: e.target.value.toUpperCase() })}
                  placeholder="Contoh: AABBCCDD atau kosongkan"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                UID tanpa titik dua, contoh: <code className="bg-slate-100 px-1 rounded">AABBCCDD</code>
              </p>
            </div>
          </div>
          <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors">
              Batal
            </button>
            <button
              onClick={onSave}
              disabled={saving || !form.name || !form.nis || (!editing && !form.email)}
              className="px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Menyimpan...</>
              ) : (
                <><span className="material-symbols-outlined text-sm">send</span> Kirim Undangan</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminStudentsPage() {
  const { isLoaded } = useUser();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", nis: "", classId: "", rfidUid: "" });
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterClass) params.set("class_id", filterClass);
      const res = await fetch(`/api/students?${params.toString()}`);
      if (res.ok) { const d = await res.json(); setStudents(d.data || []); }
    } finally { setLoading(false); }
  }, [search, filterClass]);

  const fetchClasses = async () => {
    const res = await fetch("/api/classes");
    if (res.ok) setClasses(await res.json());
  };

  useEffect(() => { if (isLoaded) { fetchStudents(); fetchClasses(); } }, [isLoaded, fetchStudents]);

  const openAdd = () => { setEditing(null); setForm({ name: "", email: "", nis: "", classId: "", rfidUid: "" }); setInvitationEmail(null); setModalOpen(true); };
  const openEdit = (s: Student) => { setEditing(s); setForm({ name: s.user?.name ?? "", email: s.user?.email ?? "", nis: s.nis, classId: s.class?.id ?? "", rfidUid: s.rfidUid ?? "" }); setInvitationEmail(null); setModalOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editing ? `/api/students/${editing.id}` : "/api/students";
      const method = editing ? "PATCH" : "POST";
      const body: Record<string, string | null> = { name: form.name, nis: form.nis, rfidUid: form.rfidUid || null, classId: form.classId || null };
      if (!editing) body.email = form.email;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        if (!editing && data.invitation_sent_to) {
          setInvitationEmail(data.invitation_sent_to);
        } else {
          setModalOpen(false);
          fetchStudents();
        }
        if (editing) { setModalOpen(false); fetchStudents(); }
      } else {
        alert(`Gagal: ${data.error}`);
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (s: Student) => {
    if (!confirm(`Nonaktifkan "${s.user?.name}"?`)) return;
    const res = await fetch(`/api/students/${s.id}`, { method: "DELETE" });
    if (res.ok) fetchStudents();
  };

  const rfidCount = students.filter((s) => s.rfidUid).length;
  const noRfidCount = students.filter((s) => !s.rfidUid).length;

  if (!isLoaded) return (
    <div className="flex items-center justify-center py-20">
      <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">progress_activity</span>
    </div>
  );

  return (
    <div className="space-y-6 pb-6">

      {/* ── Page header ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="dot-emerald dot-pulse" />
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Data Master</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Data Siswa</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? "Memuat..." : `${students.length} siswa aktif`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl font-semibold hover:bg-brand/90 transition-all active:scale-95 shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          Tambah Siswa
        </button>
      </div>

      {/* ── Stats ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Siswa" value={students.length} icon="school" color="bg-blue-50 text-blue-500" />
        <StatCard label="Terdaftar RFID" value={rfidCount} icon="contactless" color="bg-emerald-50 text-emerald-500" />
        <StatCard label="Belum RFID" value={noRfidCount} icon="warning" color="bg-amber-50 text-amber-500" />
      </div>

      {/* ── Table card ───────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 text-lg">search</span>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIS, atau RFID..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
            />
          </div>
          <select
            value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
          >
            <option value="">Semua Kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>NIS</th>
                <th>Kelas</th>
                <th>RFID UID</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">person_search</span>
                      <p className="text-sm font-semibold text-slate-500">Belum ada data siswa</p>
                      <button onClick={openAdd} className="mt-2 text-xs font-bold text-brand hover:underline">+ Tambah Siswa</button>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="group">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold ${getAvatarStyle(s.user?.name ?? "U")}`}>
                          {getInitials(s.user?.name ?? "U")}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{s.user?.name ?? "—"}</p>
                          <p className="text-[10px] text-slate-400">{s.user?.email ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm font-mono text-slate-600">{s.nis}</td>
                    <td className="text-sm text-slate-600">{s.class?.name ?? "—"}</td>
                    <td>
                      {s.rfidUid ? (
                        <span className="px-3 py-1 bg-brand-subtle rounded-lg text-[10px] font-mono font-bold text-brand border border-brand/20">
                          {s.rfidUid}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">warning</span>
                          Belum terdaftar
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge-emerald`}>
                        {s.isActive ? (
                          <><span className="dot-emerald" />Aktif</>
                        ) : (
                          <><span className="w-1.5 h-1.5 rounded-full bg-slate-400" />Nonaktif</>
                        )}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(s)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors" title="Edit">
                          <span className="material-symbols-outlined text-base text-slate-600">edit</span>
                        </button>
                        {s.isActive && (
                          <button onClick={() => handleDelete(s)} className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 transition-colors" title="Nonaktifkan">
                            <span className="material-symbols-outlined text-base text-rose-600">person_off</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen} onClose={() => setModalOpen(false)}
        editing={editing} form={form} setForm={setForm}
        classes={classes} saving={saving} onSave={handleSave}
        invitationEmail={invitationEmail}
      />
    </div>
  );
}