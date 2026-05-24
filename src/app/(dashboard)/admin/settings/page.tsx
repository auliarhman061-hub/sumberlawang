"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

interface SchoolHours {
  id: number;
  openTime: string;
  lateThreshold: string;
  closeTime: string;
  periods: number;
  periodMinutes: number;
}

interface Subject {
  id: string;
  name: string;
  abbreviation: string | null;
  type: "wajib" | "pilihan";
  createdAt: string;
}

export default function AdminSettingsPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<"school" | "subjects">("school");
  const [schoolHours, setSchoolHours] = useState<SchoolHours | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // School hours form
  const [openTime, setOpenTime] = useState("06:00");
  const [lateThreshold, setLateThreshold] = useState("07:00");
  const [closeTime, setCloseTime] = useState("16:00");
  const [periods, setPeriods] = useState(8);
  const [periodMinutes, setPeriodMinutes] = useState(45);

  // Subject form
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [subjectAbbr, setSubjectAbbr] = useState("");
  const [subjectType, setSubjectType] = useState<"wajib" | "pilihan">("wajib");
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    fetchData();
  }, [isLoaded]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hoursRes, subjectsRes] = await Promise.all([
        fetch("/api/school-hours"),
        fetch("/api/subjects"),
      ]);
      if (hoursRes.ok) {
        const data = await hoursRes.json();
        setSchoolHours(data);
        setOpenTime(data.openTime);
        setLateThreshold(data.lateThreshold);
        setCloseTime(data.closeTime);
        setPeriods(data.periods);
        setPeriodMinutes(data.periodMinutes);
      }
      if (subjectsRes.ok) {
        setSubjects(await subjectsRes.json());
      }
    } finally {
      setLoading(false);
    }
  };

  const saveSchoolHours = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/school-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openTime, lateThreshold, closeTime, periods, periodMinutes }),
      });
      if (res.ok) {
        alert("Jam sekolah berhasil diperbarui");
        fetchData();
      } else {
        alert("Gagal menyimpan");
      }
    } finally {
      setSaving(false);
    }
  };

  const saveSubject = async () => {
    setSaving(true);
    try {
      if (editingSubject) {
        const res = await fetch(`/api/subjects/${editingSubject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: subjectName, abbreviation: subjectAbbr, type: subjectType }),
        });
        if (res.ok) {
          alert("Mata pelajaran diperbarui");
          fetchData();
          closeSubjectModal();
        } else {
          alert("Gagal menyimpan");
        }
      } else {
        const res = await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: subjectName, abbreviation: subjectAbbr, type: subjectType }),
        });
        if (res.ok) {
          alert("Mata pelajaran ditambahkan");
          fetchData();
          closeSubjectModal();
        } else {
          const err = await res.json();
          alert(err.error || "Gagal menyimpan");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteSubject = async (id: string) => {
    if (!confirm("Hapus mata pelajaran ini?")) return;
    try {
      const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("Mata pelajaran dihapus");
        fetchData();
      } else {
        alert("Gagal menghapus");
      }
    } catch (error) {
      alert("Error: " + error);
    }
  };

  const openSubjectModal = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setSubjectName(subject.name);
      setSubjectAbbr(subject.abbreviation ?? "");
      setSubjectType(subject.type);
    } else {
      setEditingSubject(null);
      setSubjectName("");
      setSubjectAbbr("");
      setSubjectType("wajib");
    }
    setShowSubjectModal(true);
  };

  const closeSubjectModal = () => {
    setShowSubjectModal(false);
    setEditingSubject(null);
    setSubjectName("");
    setSubjectAbbr("");
    setSubjectType("wajib");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Pengaturan Sistem</h2>
        <p className="text-sm text-slate-500 mt-1">Konfigurasi jam sekolah dan mata pelajaran</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("school")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "school"
              ? "border-emerald-500 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Jam Sekolah
        </button>
        <button
          onClick={() => setActiveTab("subjects")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "subjects"
              ? "border-emerald-500 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Mata Pelajaran
        </button>
      </div>

      {/* School Hours Tab */}
      {activeTab === "school" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Jam Sekolah</h3>
            <p className="text-xs text-slate-400">Atur jam masuk, batas terlambat, dan jam pulang</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Jam Masuk</label>
              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Batas Terlambat</label>
              <input
                type="time"
                value={lateThreshold}
                onChange={(e) => setLateThreshold(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Jam Pulang</label>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Jumlah Jam Pelajaran</label>
              <input
                type="number"
                min="1"
                max="12"
                value={periods}
                onChange={(e) => setPeriods(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Durasi per Jam (menit)</label>
              <input
                type="number"
                min="30"
                max="90"
                value={periodMinutes}
                onChange={(e) => setPeriodMinutes(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            onClick={saveSchoolHours}
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      )}

      {/* Subjects Tab */}
      {activeTab === "subjects" && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Mata Pelajaran</h3>
              <p className="text-xs text-slate-400 mt-0.5">{subjects.length} mata pelajaran terdaftar</p>
            </div>
            <button
              onClick={() => openSubjectModal()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Tambah
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-slate-400">Nama</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-slate-400">Singkatan</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-slate-400">Jenis</th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase text-slate-400">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-400">Memuat...</td>
                  </tr>
                ) : subjects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-400">Belum ada mata pelajaran</td>
                  </tr>
                ) : (
                  subjects.map((subject) => (
                    <tr key={subject.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3 text-sm font-semibold text-slate-800">{subject.name}</td>
                      <td className="px-6 py-3 text-sm text-slate-500">{subject.abbreviation ?? "—"}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold uppercase ${
                          subject.type === "wajib" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {subject.type}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => openSubjectModal(subject)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-semibold mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteSubject(subject.id)}
                          className="text-rose-600 hover:text-rose-700 text-sm font-semibold"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingSubject ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Nama Mata Pelajaran</label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Matematika"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Singkatan</label>
              <input
                type="text"
                value={subjectAbbr}
                onChange={(e) => setSubjectAbbr(e.target.value)}
                placeholder="MTK"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Jenis</label>
              <select
                value={subjectType}
                onChange={(e) => setSubjectType(e.target.value as "wajib" | "pilihan")}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="wajib">Wajib</option>
                <option value="pilihan">Pilihan</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={closeSubjectModal}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={saveSubject}
                disabled={saving || !subjectName}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
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