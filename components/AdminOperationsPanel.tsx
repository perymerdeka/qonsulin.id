"use client";

import { useEffect, useMemo, useState } from "react";
import { Send, UserCheck } from "lucide-react";

type Companion = { id: string; name: string; role: string; badge: string; status: string };
type Member = { id: string; alias: string | null };
type Report = { id: string; thread_id: string; reporter_id: string; reason: string; status: "open" | "reviewed" | "resolved" | "dismissed"; created_at: string };
type SpecialLetter = {
  id: string;
  author_id: string;
  topic: string;
  special_destination: "mentor" | "counselor";
  handling_status: "waiting" | "assigned" | "in_progress" | "completed" | "needs_attention";
  assigned_companion_id: string | null;
  created_at: string;
  opening_letter: { id: string; title: string | null; content: string; template_code: string; created_at: string } | null;
};
type Payload = { ok: boolean; message?: string; specialLetters?: SpecialLetter[]; companions?: Companion[]; members?: Member[]; reports?: Report[] };
type Draft = { status: SpecialLetter["handling_status"]; companionId: string; response: string };

const statusMeta: Record<SpecialLetter["handling_status"], { label: string; tone: string }> = {
  waiting: { label: "Menunggu Disposisi", tone: "amber" },
  assigned: { label: "Sudah Didisposisikan", tone: "blue" },
  in_progress: { label: "Sedang Diproses", tone: "indigo" },
  completed: { label: "Selesai", tone: "emerald" },
  needs_attention: { label: "Perlu Perhatian", tone: "rose" }
};
const reportLabels = { open: "Baru", reviewed: "Ditinjau", resolved: "Selesai", dismissed: "Ditutup" } as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function AdminOperationsPanel() {
  const [payload, setPayload] = useState<Payload>({ ok: true, specialLetters: [], companions: [], members: [], reports: [] });
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const aliasById = useMemo(() => new Map((payload.members || []).map((member) => [member.id, member.alias || "Member"])), [payload.members]);
  const companionById = useMemo(() => new Map((payload.companions || []).map((companion) => [companion.id, companion])), [payload.companions]);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/operations", { cache: "no-store" });
      const data = await response.json().catch(() => ({})) as Payload;
      if (!response.ok || !data.ok) throw new Error(data.message || "Data operasi tidak dapat dimuat.");
      setPayload(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Data operasi tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function draftFor(item: SpecialLetter): Draft {
    return drafts[item.id] || { status: item.handling_status || "waiting", companionId: item.assigned_companion_id || "", response: "" };
  }

  function updateDraft(item: SpecialLetter, update: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [item.id]: { ...draftFor(item), ...current[item.id], ...update } }));
  }

  async function save(item: SpecialLetter) {
    const draft = draftFor(item);
    setMessage("");
    try {
      const response = await fetch("/api/admin/operations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "special-letter", id: item.id, handling_status: draft.status, assigned_companion_id: draft.companionId || null, operator_response: draft.response })
      });
      const data = await response.json().catch(() => ({})) as Payload;
      if (!response.ok || !data.ok) throw new Error(data.message || "Penanganan surat belum tersimpan.");
      setMessage(data.message || "Penanganan surat diperbarui.");
      setDrafts((current) => ({ ...current, [item.id]: { ...draft, response: "" } }));
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Penanganan surat belum tersimpan.");
    }
  }

  async function updateReport(id: string, status: string) {
    const response = await fetch("/api/admin/operations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "report", id, status }) });
    const data = await response.json().catch(() => ({})) as Payload;
    if (!response.ok || !data.ok) setMessage(data.message || "Status laporan belum tersimpan.");
    else { setMessage(data.message || "Status laporan diperbarui."); await load(); }
  }

  return <>
    <div className="admin-title"><div><h1>Surat Tujuan Khusus</h1><p>Surat privat masuk ke admin terlebih dahulu. Disposisi ke profil pendamping tidak membuat akun atau akses dashboard baru.</p></div><button type="button" className="btn btn-white" disabled={loading} onClick={() => void load()}>Muat Ulang</button></div>
    {message && <p className="admin-alert" role="status">{message}</p>}
    {loading ? <div className="admin-card">Memuat surat privat...</div> : <div className="admin-operations-grid">
      <section className="admin-card" style={{ gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}><h2>Inbox Penanganan</h2><span className="pill muted">{payload.specialLetters?.length || 0} Surat</span></div>
        {(payload.specialLetters || []).length === 0 ? <p style={{ color: "var(--color-muted)" }}>Belum ada surat tujuan khusus.</p> : <div className="operation-list">
          {payload.specialLetters?.map((item) => {
            const draft = draftFor(item);
            const assignee = item.assigned_companion_id ? companionById.get(item.assigned_companion_id) : null;
            const meta = statusMeta[item.handling_status || "waiting"];
            return <article key={item.id} className="support-dispatch-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "flex-start" }}><div><strong>{item.special_destination === "mentor" ? "Surat untuk Mentor" : "Surat untuk Konselor"}</strong><span style={{ display: "block", color: "var(--color-muted)", fontSize: "0.82rem" }}>Pengirim: {aliasById.get(item.author_id) || "Member"} - {formatDate(item.created_at)}</span></div><span className={"pill " + meta.tone}>{meta.label}</span></div>
              <details className="review-content"><summary>Baca isi surat</summary><h3>{item.opening_letter?.title || item.topic}</h3><p>{item.opening_letter?.content || "Isi surat tidak tersedia."}</p></details>
              {assignee && <div className="assigned-box"><UserCheck size={15} style={{ color: "var(--color-brand)" }} /><div><span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Diteruskan ke: {assignee.name}</span><span style={{ display: "block", fontSize: "0.76rem", color: "var(--color-muted)" }}>{assignee.role}</span></div></div>}
              <div className="dispatch-controls">
                <label className="field"><span>Status penanganan</span><select value={draft.status} onChange={(event) => updateDraft(item, { status: event.target.value as Draft["status"] })}>{Object.entries(statusMeta).map(([value, info]) => <option value={value} key={value}>{info.label}</option>)}</select></label>
                <label className="field"><span>Disposisi ke profil pendamping</span><select value={draft.companionId} onChange={(event) => updateDraft(item, { companionId: event.target.value })}><option value="">Belum ditugaskan</option>{payload.companions?.map((companion) => <option value={companion.id} key={companion.id}>{companion.name} ({companion.role})</option>)}</select></label>
                <label className="field"><span>Balasan untuk member</span><textarea value={draft.response} maxLength={3000} rows={5} onChange={(event) => updateDraft(item, { response: event.target.value })} placeholder="Tulis atau teruskan balasan pendamping. Balasan akan ditampilkan sebagai surat Tim Qonsulin di thread privat member." /></label>
                <button type="button" className="btn btn-primary" onClick={() => void save(item)}><Send size={16} /> Simpan Penanganan</button>
              </div>
            </article>;
          })}
        </div>}
      </section>
      {(payload.reports || []).length > 0 && <section className="admin-card" style={{ gridColumn: "1 / -1" }}><h2>Laporan Komunitas</h2><div className="operation-list">{payload.reports?.map((report) => <article key={report.id}><strong>{report.reason}</strong><span>{aliasById.get(report.reporter_id) || "Member"} - {formatDate(report.created_at)}</span><select value={report.status} onChange={(event) => void updateReport(report.id, event.target.value)}>{Object.entries(reportLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></article>)}</div></section>}
    </div>}
  </>;
}
