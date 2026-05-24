"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

const DAYS = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu"] as const;
const DAY_LABELS: Record<string, string> = {
  senin: "Senin", selasa: "Selasa", rabu: "Rabu",
  kamis: "Kamis", jumat: "Jumat", sabtu: "Sabtu",
};

interface Subject { id: string; name: string; abbreviation: string | null }
interface Class { id: string; name: string; grade: number }
interface User { id: string; name: string }
interface Schedule {
  id: string; day: string; period: number; academicYear: string;
  subject: Subject; class: Class; teacher: User;
}

export default function AdminSchedulesPage() {
  const { isLoaded } = useUser();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterDay, setFilterDay] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");

  // Form
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDay, setFormDay] = useState<typeof DAYS[number]>("senin");
  const [formPeriod, setFormPeriod] = useState(1);
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formAcademicYear, setFormAcademicYear] = useState("2025/2026");

  useEffect(() => {
    if (!isLoaded) return;
    fetchAll();
  }, [isLoaded, filterDay, filterClass, filterTeacher]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDay) params.set("day", filterDay);
      if (filterClass) params.set("class_id", filterClass);
      if (filterTeacher) params.set("teacher_id", filterTeacher);

      const [schedRes, subRes, clsRes, usersRes] = await Promise.all([
        fetch(`/api/schedules?${params.toString()}`),
        fetch("/api/subjects"),
        fetch("/api/classes"),
        fetch("/api/users?role=teacher"),
      ]);

      if (schedRes.ok) {
        const data = await schedRes.json();
        setSchedules(data.data ?? []);
      }
      if (subRes.ok) setSubjects(await subRes.json());
      if (clsRes.ok) {
        const clsData = await clsRes.json();
        setClasses(clsData);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setTeachers(usersData.filter((u: User & { role?: string }) => u.role === "teacher" || true));
      }
    } finally {
      setLoading(false);
    }
  };

  const openModal = (schedule?: Schedule) => {
    if (schedule) {
      setEditingId(schedule.id);
      setFormDay(schedule.day as typeof DAYS[number]);
      setFormPeriod(schedule.period);
      setFormSubjectId(schedule.subject.id);
      setFormClassId(schedule.class.id);
      setFormTeacherId(schedule.teacher.id);
      setFormAcademicYear(schedule.academicYear);
    } else {
      setEditingId(null);
      setFormDay("senin");
      setFormPeriod(1);
      setFormSubjectId("");
      setFormClassId("");
      setFormTeacherId("");
      setFormAcademicYear("2025/2026");
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const saveSchedule = async () => {
    if (!formSubjectId || !formClassId || !formTeacherId) {
      alert("Mohon isi semua field");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        day: formDay,
        period: formPeriod,
        subjectId: formSubjectId,
        classId: formClassId,
        teacherId: formTeacherId,
        academicYear: formAcademicYear,
      };

      const url = editingId ? `/api/schedules/${editingId}` : "/api/schedules";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert(editingId ? "Jadwal diperbarui" : "Jadwal dibuat");
        closeModal();
        fetchAll();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menyimpan");
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm("Hapus jadwal ini?")) return;
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("Jadwal dihapus");
        fetchAll();
      } else {
        alert("Gagal menghapus");
      }
    } catch (e) {
      alert("Error: " + e);
    }
  };

  // Group schedules by day then by period
  const grouped: Record<string, Schedule[]> = {};
  for (const s of schedules) {
    if (!grouped[s.day]) grouped[s.day] = [];
    grouped[s.day].push(s);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Jadwal Pelajaran</h2>
          <p className="text-sm text-slate-500 mt-1">Kelola jadwal pelajaran per kelas dan guru</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Tambah Jadwal
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterDay}
          onChange={(e) => setFilterDay(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        >
          <option value="">Semua Hari</option>
          {DAYS.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
        </select>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        >
          <option value="">Semua Kelas</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={filterTeacher}
          onChange={(e) => setFilterTeacher(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        >
          <option value="">Semua Guru</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* Schedule table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <p className="text-xs font-semibold text-slate-500">{schedules.length} jadwal ditemukan</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Hari", "Jam ke", "Mata Pelajaran", "Kelas", "Guru", "Tahun Ajaran", "Aksi"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-400 first:rounded-tl-xl last:rounded-tr-xl">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-5xl text-slate-200">calendar_today</span>
                      <p className="text-sm font-semibold text-slate-400">Belum ada jadwal</p>
                      <p className="text-xs text-slate-300">Klik "Tambah Jadwal" untuk memulai</p>
                    </div>
                  </td>
                </tr>
              ) : (
                schedules.map((s) => (
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
                    <td className="px-5 py-3 text-sm text-slate-600">{s.teacher.name}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{s.academicYear}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => openModal(s)} className="text-blue-600 hover:text-blue-700 text-xs font-semibold mr-3">Edit</button>
                      <button onClick={() => deleteSchedule(s.id)} className="text-rose-600 hover:text-rose-700 text-xs font-semibold">Hapus</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900">{editingId ? "Edit Jadwal" : "Tambah Jadwal"}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hari</label>
                <select
                  value={formDay}
                  onChange={(e) => setFormDay(e.target.value as typeof DAYS[number])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20"
                >
                  {DAYS.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jam ke-</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mata Pelajaran</label>
              <select
                value={formSubjectId}
                onChange={(e) => setFormSubjectId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">— Pilih Mata Pelajaran —</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.abbreviation})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kelas</label>
              <select
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">— Pilih Kelas —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Guru</label>
              <select
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">— Pilih Guru —</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tahun Ajaran</label>
              <input
                type="text"
                value={formAcademicYear}
                onChange={(e) => setFormAcademicYear(e.target.value)}
                placeholder="2025/2026"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={saveSchedule}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}