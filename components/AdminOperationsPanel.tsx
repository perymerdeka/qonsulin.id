"use client";

import { useEffect, useMemo, useState } from "react";
import { Send, UserCheck } from "lucide-react";

type Companion = { id: string; name: string; role: string; badge: string; status: string };
type Member = { id: string; alias: string | null };
type Report = { id: string; thread_id: string; reporter_id: string; reason: string; status: "open" | "reviewed" | "resolved" | "dismissed"; created_at: string };
type SpecialDestination = "screening" | "mentor" | "counselor";
type SpecialLetter = {
  id: string;
  author_id: string;
  topic: string;
  special_destination: SpecialDestination;
  handling_status: "waiting" | "assigned" | "in_progress" | "completed" | "needs_attention";
  assigned_companion_id: string | null;
  created_at: string;
  opening_letter: { id: string; title: string | null; content: string; template_code: string; created_at: string } | null;
};
type Payload = { ok: boolean; message?: string; specialLetters?: SpecialLetter[]; companions?: Companion[]; members?: Member[]; reports?: Report[] };
type Draft = { status: SpecialLetter["handling_status"]; companionId: string };
type DestinationFilter = "all" | "mentor" | "counselor";

const statusMeta: Record<SpecialLetter["handling_status"], { label: string; tone: string }> = {
  waiting: { label: "Diterima", tone: "amber" },
  assigned: { label: "Tujuan Ditetapkan", tone: "blue" },
  in_progress: { label: "Sedang Ditinjau", tone: "indigo" },
  completed: { label: "Selesai", tone: "emerald" },
  needs_attention: { label: "Perlu Perhatian", tone: "rose" }
};
const reportLabels = { open: "Baru", reviewed: "Ditinjau", resolved: "Selesai", dismissed: "Ditutup" } as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function destinationLabel(destination: SpecialDestination) {
  if (destination === "mentor") return "Mentor";
  if (destination === "counselor") return "Konselor";
  return "Tujuan lama";
}

export function AdminOperationsPanel() {
  const [payload, setPayload] = useState<Payload>({ ok: true, specialLetters: [], companions: [], members: [], reports: [] });
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [destinationFilter, setDestinationFilter] = useState<DestinationFilter>("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const aliasById = useMemo(() => new Map((payload.members || []).map((member) => [member.id, member.alias || "Member"])), [payload.members]);
  const companionById = useMemo(() => new Map((payload.companions || []).map((companion) => [companion.id, companion])), [payload.companions]);
  const specialLetters = useMemo(() => (payload.specialLetters || []).filter((item) => destinationFilter === "all" || item.special_destination === destinationFilter), [destinationFilter, payload.specialLetters]);

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
    return drafts[item.id] || { status: item.handling_status || "waiting", companionId: item.assigned_companion_id || "" };
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
        body: JSON.stringify({ type: "special-letter", id: item.id, handling_status: draft.status, assigned_companion_id: draft.companionId || null })
      });
      const data = await response.json().catch(() => ({})) as Payload;
      if (!response.ok || !data.ok) throw new Error(data.message || "Penanganan surat belum tersimpan.");
      setMessage(data.message || "Penanganan surat khusus diperbarui.");
      setDrafts((current) => ({ ...current, [item.id]: draft }));
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
    <div className="admin-title"><div><h1>Surat Khusus</h1><p>Surat privat yang dikirim member untuk Mentor atau Konselor. Surat tidak masuk Kolam Surat dan balasan melalui platform belum tersedia.</p></div><button type="button" className="btn btn-white" disabled={loading} onClick={() => void load()}>Muat Ulang</button></div>
    {message && <p className="admin-alert" role="status">{message}</p>}
    {loading ? <div className="admin-card">Memuat surat khusus...</div> : <div className="admin-operations-grid">
      <section className="admin-card" style={{ gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}><div><h2>Inbox Surat Khusus</h2><p style={{ margin: "0.25rem 0 0", color: "var(--color-muted)", fontSize: "0.86rem" }}>Tetapkan profil tujuan secara internal dan perbarui statusnya. Penetapan ini belum mengirim notifikasi ke mentor/konselor.</p></div><span className="pill muted">{specialLetters.length} Surat</span></div>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          {(["all", "mentor", "counselor"] as DestinationFilter[]).map((filter) => <button type="button" key={filter} className={destinationFilter === filter ? "btn btn-primary" : "btn btn-white"} onClick={() => setDestinationFilter(filter)}>{filter === "all" ? "Semua" : destinationLabel(filter)}</button>)}
        </div>
        {specialLetters.length === 0 ? <p style={{ color: "var(--color-muted)" }}>Belum ada surat khusus pada filter ini.</p> : <div className="operation-list">
          {specialLetters.map((item) => {
            const draft = draftFor(item);
            const assignee = item.assigned_companion_id ? companionById.get(item.assigned_companion_id) : null;
            const meta = statusMeta[item.handling_status || "waiting"];
            return <article key={item.id} className="support-dispatch-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "flex-start" }}><div><strong>Surat untuk {destinationLabel(item.special_destination)}</strong><span style={{ display: "block", color: "var(--color-muted)", fontSize: "0.82rem" }}>Pengirim: {aliasById.get(item.author_id) || "Member"} - {formatDate(item.created_at)}</span></div><div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}><span className="pill muted">{destinationLabel(item.special_destination)}</span><span className={"pill " + meta.tone}>{meta.label}</span></div></div>
              <details className="review-content"><summary>Baca isi surat</summary><p>{item.opening_letter?.content || "Isi surat tidak tersedia."}</p></details>
              {assignee && <div className="assigned-box"><UserCheck size={15} style={{ color: "var(--color-brand)" }} /><div><span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Profil tujuan: {assignee.name}</span><span style={{ display: "block", fontSize: "0.76rem", color: "var(--color-muted)" }}>{assignee.role}</span></div></div>}
              <div className="dispatch-controls">
                <label className="field"><span>Status surat</span><select value={draft.status} onChange={(event) => updateDraft(item, { status: event.target.value as Draft["status"] })}>{Object.entries(statusMeta).map(([value, info]) => <option value={value} key={value}>{info.label}</option>)}</select></label>
                <label className="field"><span>Tetapkan profil tujuan</span><select value={draft.companionId} onChange={(event) => updateDraft(item, { companionId: event.target.value })}><option value="">Belum ditetapkan</option>{payload.companions?.map((companion) => <option value={companion.id} key={companion.id}>{companion.name} ({companion.role})</option>)}</select></label>
                <p style={{ margin: 0, color: "var(--color-muted)", fontSize: "0.82rem" }}>Balasan surat melalui platform belum diaktifkan.</p>
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
