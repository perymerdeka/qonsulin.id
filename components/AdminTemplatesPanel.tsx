"use client";

import { useEffect, useState } from "react";
import type { LetterTemplate } from "@/lib/letters";

type Payload = { ok: boolean; message?: string; templates?: LetterTemplate[] };

export function AdminTemplatesPanel() {
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/templates", { cache: "no-store" });
      const data = await response.json().catch(() => ({})) as Payload;
      if (!response.ok || !data.ok) throw new Error(data.message || "Template tidak dapat dimuat.");
      setTemplates(data.templates || []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Template tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function change(id: string, field: keyof LetterTemplate, value: string | number | boolean) {
    setTemplates((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  async function save(item: LetterTemplate) {
    setSaving(item.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
      const data = await response.json().catch(() => ({})) as Payload;
      if (!response.ok || !data.ok) throw new Error(data.message || "Template gagal disimpan.");
      setMessage(data.message || "Template diperbarui.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Template gagal disimpan.");
    } finally {
      setSaving(null);
    }
  }

  return <>
    <div className="admin-title"><div><h1>Template Surat</h1><p>Kelola template yang sudah tersedia. Gaya kertas dan warna segel mengikuti komponen desain yang ada.</p></div><button type="button" className="btn btn-white" onClick={() => void load()} disabled={loading || Boolean(saving)}>Muat Ulang</button></div>
    {message && <p role="status" className="admin-alert">{message}</p>}
    {loading ? <div className="admin-card">Memuat template...</div> : <div className="admin-operations-grid">{templates.map((item) => <section key={item.id} className="admin-card sprint4-form">
      <h2>{item.code}</h2>
      <label className="field"><span>Nama template</span><input value={item.name} maxLength={80} onChange={(event) => change(item.id, "name", event.target.value)} /></label>
      <label className="field"><span>Akses</span><select value={item.tier_required} onChange={(event) => change(item.id, "tier_required", event.target.value)}><option value="free">Free</option><option value="premium">Premium</option></select></label>
      <label className="field"><span>Urutan</span><input type="number" min={0} max={999} value={item.sort_order} onChange={(event) => change(item.id, "sort_order", Number(event.target.value))} /></label>
      <label className="sprint4-consent"><input type="checkbox" checked={item.is_active} onChange={(event) => change(item.id, "is_active", event.target.checked)} />Aktif</label>
      <button type="button" className="btn btn-primary" disabled={Boolean(saving)} onClick={() => void save(item)}>{saving === item.id ? "Menyimpan..." : "Simpan Template"}</button>
    </section>)}</div>}
  </>;
}