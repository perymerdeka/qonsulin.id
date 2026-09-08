"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookOpenText, CalendarCheck2, CalendarPlus2, Database, Eye, FilePlus2, FileText, Globe2, ImagePlus, Images, LayoutDashboard, LogOut, MessageCircle, MessageSquarePlus, MessageSquareQuote, PenLine, Radio, RefreshCw, Save, Settings as SettingsIcon, ShieldCheck, Trash2, Upload, UsersRound } from "lucide-react";
import { Brand } from "@/components/PublicChrome";
import { fallbackActivities, fallbackCompanions, fallbackGalleryEvents, fallbackLeadMagnets, fallbackPosts, fallbackStreamingVideos, fallbackTestimonials, slugify, type ActivityItem, type BlogPost, type CmsStatus, type CompanionProfile, type GalleryEvent, type LeadMagnet, type StreamingVideo, type Testimonial } from "@/lib/cms";
import { hasSupabaseEnv } from "@/lib/supabase";
import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import Image from "next/image";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), { ssr: false, loading: () => <div style={{ padding: "20px", border: "1px solid #ddd", background: "white", borderRadius: "8px", marginTop: "10px" }}>Memuat Editor...</div> });


type Section = "dashboard" | "posts" | "activities" | "testimonials" | "lead-magnets" | "galleries" | "streaming" | "companions" | "settings";
type Mode = "list" | "new" | "edit";
type AnyRow = BlogPost | ActivityItem | Testimonial | LeadMagnet | GalleryEvent | StreamingVideo | CompanionProfile;
type Store = {
  posts: BlogPost[];
  activities: ActivityItem[];
  testimonials: Testimonial[];
  "lead-magnets": LeadMagnet[];
  galleries: GalleryEvent[];
  streaming: StreamingVideo[];
  companions: CompanionProfile[];
};

type CmsApiResponse = {
  ok?: boolean;
  message?: string;
  store?: Store;
  row?: AnyRow;
};

const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://qonsulin.id";
const adminEmail = process.env.NEXT_PUBLIC_QONSULIN_ADMIN_EMAIL || "halo@qonsulin.id";

const sections: Array<{ id: Section; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { id: "dashboard", label: "Ringkasan Statistik", icon: LayoutDashboard },
  { id: "posts", label: "Katalog Artikel", icon: BookOpenText },
  { id: "activities", label: "Aktivitas & Kegiatan", icon: CalendarCheck2 },
  { id: "testimonials", label: "Ulasan & Testimoni", icon: MessageSquareQuote },
  { id: "lead-magnets", label: "Ebook & Panduan", icon: FileText },
  { id: "galleries", label: "Dokumentasi Galeri", icon: Images },
  { id: "streaming", label: "Tayangan Video", icon: Radio },
  { id: "companions", label: "Kelola Pendamping", icon: UsersRound },
  { id: "settings", label: "Status & Sinkronisasi", icon: SettingsIcon }
];

const tableBySection = {
  posts: "blog_posts",
  activities: "activities",
  testimonials: "testimonials",
  "lead-magnets": "lead_magnets",
  galleries: "gallery_events",
  streaming: "streaming_videos",
  companions: "companions"
} as const;

const fallbackStore: Store = {
  posts: fallbackPosts,
  activities: fallbackActivities,
  testimonials: fallbackTestimonials,
  "lead-magnets": fallbackLeadMagnets,
  galleries: fallbackGalleryEvents,
  streaming: fallbackStreamingVideos,
  companions: fallbackCompanions
};

export default function AdminApp({ initialSlug, initialAuthenticated }: { initialSlug: string[]; initialAuthenticated: boolean }) {
  const initialSection = parseSection(initialSlug[0]);
  const [section, setSection] = useState<Section>(initialSection);
  const [mode, setMode] = useState<Mode>(initialSlug[1] === "new" ? "new" : initialSlug[2] === "edit" ? "edit" : "list");
  const [editingId, setEditingId] = useState<string | null>(initialSlug[2] === "edit" ? initialSlug[1] || null : null);
  const [loggedIn, setLoggedIn] = useState(() => initialAuthenticated || previewEnabled());
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState<Store>(fallbackStore);

  useEffect(() => {
    if (loggedIn) void loadAll();
  }, [loggedIn]);

  async function loadAll() {
    setLoading(true);
    try {
      const api = previewEnabled() ? null : await fetch("/api/admin/cms", { cache: "no-store" }).catch(() => null);
      if (api?.ok) {
        const body = await api.json() as CmsApiResponse;
        if (body.store) {
          setStore(body.store);
          return;
        }
      }

      if (typeof window !== "undefined") {
        const localSaved = localStorage.getItem("qonsulin_local_cms_store");
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            const merge = <T extends { id: string }>(saved?: T[], defaults?: T[]) => {
              if (!Array.isArray(saved) || saved.length === 0) return defaults || [];
              const savedIds = new Set(saved.map((item) => item.id));
              const missingDefaults = (defaults || []).filter((item) => !savedIds.has(item.id));
              return [...saved, ...missingDefaults];
            };
            setStore({
              posts: merge(parsed.posts, fallbackStore.posts),
              activities: merge(parsed.activities, fallbackStore.activities),
              testimonials: merge(parsed.testimonials, fallbackStore.testimonials),
              "lead-magnets": merge(parsed["lead-magnets"], fallbackStore["lead-magnets"]),
              galleries: merge(parsed.galleries, fallbackStore.galleries),
              streaming: merge(parsed.streaming, fallbackStore.streaming),
              companions: merge(parsed.companions, fallbackStore.companions)
            });
          } catch {
            setStore(fallbackStore);
          }
        } else {
          setStore(fallbackStore);
        }
      }
      setMessage("Mode Penyimpanan Lokal Aktif: Perubahan tersimpan aman di perangkat Anda.");
    } finally {
      setLoading(false);
    }
  }

  if (!loggedIn) {
    return <LoginScreen onLogin={() => setLoggedIn(true)} message={message} setMessage={setMessage} />;
  }

  const collectionSection = isCollection(section) ? section : "posts";
  const editingRow = mode === "edit" ? store[collectionSection].find((row) => row.id === editingId) || null : null;

  function navigate(next: Section, nextMode: Mode = "list", id?: string) {
    setSection(next);
    setMode(nextMode);
    setEditingId(id || null);
    window.history.pushState(null, "", adminPath(next, nextMode, id));
  }

  async function save(sectionId: Exclude<Section, "dashboard" | "settings">, payload: Record<string, unknown>, id?: string) {
    setLoading(true);
    setMessage("");
    const now = new Date().toISOString();
    const normalized = normalizePayload(sectionId, payload, now);

    try {
      let saved: AnyRow | null = null;
      const api = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: sectionId, id, payload })
      }).catch(() => null);

      if (api?.ok) {
        const body = await api.json() as CmsApiResponse;
        saved = body.row || null;
      }

      const isLocalMode = !saved;
      if (!saved) {
        const existingRow = id ? store[sectionId].find((r) => r.id === id) : null;
        saved = {
          id: id || `local-${Date.now()}`,
          ...existingRow,
          ...normalized,
          created_at: id ? ((existingRow as any)?.created_at || now) : now,
          updated_at: now
        } as AnyRow;
      }

      setStore((current) => {
        const updatedList = id
          ? current[sectionId].map((row) => row.id === id ? { ...row, ...saved } : row)
          : [saved as never, ...current[sectionId]];
        const newStore = { ...current, [sectionId]: updatedList };
        if (isLocalMode && typeof window !== "undefined") {
          localStorage.setItem("qonsulin_local_cms_store", JSON.stringify(newStore));
        }
        return newStore;
      });

      setMessage("Konten berhasil disimpan.");
      navigate(sectionId);
    } catch (error) {
      console.error("[CMS Admin Error]:", error);
      const text = String(error instanceof Error ? error.message : error || "").toLowerCase();
      if (text.includes("api key") || text.includes("apikey") || text.includes("jwt") || text.includes("pgrst")) {
        setMessage("Gagal menyinkronkan ke server. Data Anda telah diselamatkan secara lokal di browser.");
      } else {
        setMessage(error instanceof Error ? error.message : "Gagal menyimpan data CMS.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function remove(sectionId: Exclude<Section, "dashboard" | "settings">, id: string) {
    if (!window.confirm("Hapus konten ini dari CMS?")) return;
    const api = await fetch(`/api/admin/cms?section=${encodeURIComponent(sectionId)}&id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
    if (api?.ok) {
      setStore((current) => {
        const newStore = { ...current, [sectionId]: current[sectionId].filter((row) => row.id !== id) };
        if (typeof window !== "undefined") localStorage.setItem("qonsulin_local_cms_store", JSON.stringify(newStore));
        return newStore;
      });
      setMessage("Konten berhasil dihapus.");
      return;
    }

    setStore((current) => {
      const newStore = { ...current, [sectionId]: current[sectionId].filter((row) => row.id !== id) };
      if (typeof window !== "undefined") localStorage.setItem("qonsulin_local_cms_store", JSON.stringify(newStore));
      return newStore;
    });
    setMessage("Konten berhasil dihapus.");
  }

  return (
    <main className="admin">
      <div className="admin-shell">
        <aside className="sidebar">
          <div><div className="admin-brand-row"><Brand /><span>ADMIN</span></div><div className="admin-user"><strong>Level: Administrator</strong><br /><small>{adminEmail}</small></div></div>
          <nav className="admin-nav">
            {sections.map((item) => {
              const Icon = item.icon;
              return <button className={section === item.id ? "active" : ""} key={item.id} onClick={() => navigate(item.id)}><Icon size={18} />{item.label}</button>;
            })}
          </nav>
          <div style={{ marginTop: "auto", display: "grid", gap: ".5rem" }}>
            <a className="admin-badge" href={publicSiteUrl} target="_blank" rel="noreferrer"><Globe2 size={15} />Lihat Website Publik</a>
            <button className="admin-badge" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); setLoggedIn(false); }}><LogOut size={15} />Keluar Akun (Log Out)</button>
          </div>
        </aside>
        <section className="admin-main">
          {message && <div className="admin-alert">{message}</div>}
          {section === "dashboard" && <Dashboard store={store} setSection={(next) => navigate(next)} />}
          {section === "settings" && <Settings loading={loading} onRefresh={loadAll} />}
          {isCollection(section) && mode === "list" && <Collection section={section} rows={store[section]} openNew={() => navigate(section, "new")} openEdit={(id) => navigate(section, "edit", id)} onDelete={(id) => remove(section, id)} />}
          {isCollection(section) && mode !== "list" && <CmsForm section={section} row={editingRow} loading={loading} onCancel={() => navigate(section)} onSubmit={(payload) => save(section, payload, editingRow?.id)} />}
          <footer className="admin-footer">Panel Pengelola Qonsulin.id - Sumatra Barat</footer>
        </section>
      </div>
    </main>
  );
}

function LoginScreen({ onLogin, message, setMessage }: { onLogin: () => void; message: string; setMessage: (value: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const supabaseReady = hasSupabaseEnv();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    if (normalizedEmail !== adminEmail) {
      setMessage("Akses tidak diizinkan. Email belum terdaftar di whitelist administrator.");
      return;
    }

    const serverResponse = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword })
    }).catch(() => null);

    if (serverResponse?.ok) {
      onLogin();
      return;
    }

    const serverBody = serverResponse ? await serverResponse.json().catch(() => null) as null | { message?: string } : null;
    setMessage(serverBody?.message || "Email atau kata sandi admin belum sesuai.");
  }

  return (
    <main className="admin admin-login">
      <div className="login-card">
        <div className="login-brand"><Brand /><h2>PORTAL PENGELOLA INTERNAL</h2><p>Khusus staf administrasi terdaftar. Tidak ditayangkan di navigasi publik website kami.</p></div>
        <div className="login-panel">
          <form onSubmit={submit}>
            <label className="field"><span>Email Administrator</span><input type="email" required placeholder="nama@domain.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label className="field"><span>Kata Sandi</span><input type="password" required placeholder="********" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {message && <p style={{ color: "oklch(77% 0.16 45)", lineHeight: 1.55 }}>{message}</p>}
            <button className="btn btn-primary" style={{ width: "100%" }} type="submit">Masuk Portal Admin</button>
          </form>
          <div className="live"><ShieldCheck size={16} />{supabaseReady ? "Terhubung ke Server Online" : "Mode Penyimpanan Lokal"}</div>
        </div>
        <p style={{ textAlign: "center", marginTop: "1.5rem" }}><a href={publicSiteUrl}>← Kembali ke Website Qonsulin.id</a></p>
      </div>
    </main>
  );
}

function Dashboard({ store, setSection }: { store: Store; setSection: (section: Section) => void }) {
  const stats = [
    { label: "Artikel Terbit", number: store.posts.filter((row) => row.status === "published").length, help: `${store.posts.filter((row) => row.status === "draft").length} draf tersimpan`, id: "posts", icon: FileText, tone: "blue" },
    { label: "Social Proof", number: store.activities.length, help: "Aktivitas riil komunitas", id: "activities", icon: CalendarCheck2, tone: "emerald" },
    { label: "Ulasan Anonim", number: store.testimonials.length, help: "Testimoni aman terjaga", id: "testimonials", icon: MessageCircle, tone: "amber" },
    { label: "Lead Magnet", number: store["lead-magnets"].length, help: "Bimbingan ebook gratis", id: "lead-magnets", icon: Upload, tone: "rose" },
    { label: "Galeri Kegiatan", number: store.galleries.length, help: `${store.galleries.filter((row) => row.status === "published").length} terbit, ${store.galleries.filter((row) => row.status === "draft").length} draf`, id: "galleries", icon: Images, tone: "violet" },
    { label: "Pendamping", number: store.companions.length, help: "Profil tampil di landing page", id: "companions", icon: UsersRound, tone: "emerald" }
  ] as const;
  const quickActions = [
    ["Buat Artikel Baru", "posts", FilePlus2],
    ["Tambah Aktivitas", "activities", CalendarPlus2],
    ["Tambah Testimonial", "testimonials", MessageSquarePlus],
    ["Tambah Lead Magnet", "lead-magnets", Upload],
    ["Tambah Kegiatan", "galleries", ImagePlus],
    ["Tambah Pendamping", "companions", UsersRound]
  ] as const;

  return (
    <>
      <div className="admin-title"><div><h1>Ringkasan Statistik Qonsulin.id</h1><p>Pantau dan sunting seluruh konten pertumbuhan dari menu administrasi rahasia ini.</p></div><span className="admin-badge"><Database size={15} />Status Penyimpanan: Terhubung Online</span></div>
      <div className="stats">{stats.map((item) => {
        const Icon = item.icon;
        return <button className="stat" key={item.label} onClick={() => setSection(item.id)}><span className={`stat-icon ${item.tone}`}><Icon size={16} /></span><small>{item.label}</small><h3>{item.number}</h3><p>{item.help}</p></button>;
      })}</div>
      <div className="admin-grid">
        <article className="admin-card"><h3>Aksi Cepat Pengelola</h3><div className="quick">{quickActions.map(([label, id, Icon]) => <button key={label} onClick={() => setSection(id as Section)}><Icon size={16} />{label}</button>)}</div></article>
        <article className="admin-card guide-card"><h3>Pedoman Keselamatan Hukum (Mental Wellness)</h3><p>Sistem administrasi QONSULIN.ID dibangun guna mendukung perbanyakan konten edukatif batin (Mental Wellness) dan Social Proof aktivitas.</p><div className="guidelines">{["Persona Anonim: Saat mengunggah testimoni klien, dilarang merekam nama asli.", "Mencegah Klaim Mutlak: Gunakan diksi ramah seperti pendampingan batin, konseling terarah, kawan cerita, mental wellness.", "Akurasi Social Proof: Pastikan seluruh daftar aktivitas yang disiarkan di homepage mewakili agenda riil yang pernah dilaksanakan."].map((item) => <p className="guideline" key={item}><span className="ok">OK</span><span>{item}</span></p>)}</div></article>
      </div>
    </>
  );
}

function Collection({ section, rows, openNew, openEdit, onDelete }: { section: Exclude<Section, "dashboard" | "settings">; rows: AnyRow[]; openNew: () => void; openEdit: (id: string) => void; onDelete: (id: string) => void }) {
  const config = collectionConfig(section);
  const [status, setStatus] = useState<CmsStatus | "all">("all");
  const visibleRows = status === "all" ? rows : rows.filter((row) => "status" in row && row.status === status);
  return (
    <>
      <div className="admin-title"><div><h1>{config.title}</h1><p>{config.subtitle}</p></div><button className="btn btn-primary" onClick={openNew}><FilePlus2 size={15} />{config.button}</button></div>
      <div className="admin-toolbar"><select value={status} onChange={(event) => setStatus(event.target.value as CmsStatus | "all")}><option value="all">Status: Semua</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></div>
      <div className="table-wrap"><table><thead><tr>{config.columns.map((column) => <th key={column}>{column}</th>)}<th>Aksi</th></tr></thead><tbody>{visibleRows.length === 0 ? <tr><td colSpan={config.columns.length + 1}>Belum ada data pada filter ini.</td></tr> : visibleRows.map((row) => <tr key={row.id}>{config.render(row)}<td><span className="icon-actions"><a href={publicHref(section, row)} aria-label="lihat" target="_blank"><Eye size={16} /></a><button aria-label="edit" onClick={() => openEdit(row.id)}><PenLine size={16} /></button><button aria-label="hapus" onClick={() => onDelete(row.id)}><Trash2 size={16} /></button></span></td></tr>)}</tbody></table></div>
    </>
  );
}

function CmsForm({ section, row, loading, onCancel, onSubmit }: { section: Exclude<Section, "dashboard" | "settings">; row: AnyRow | null; loading: boolean; onCancel: () => void; onSubmit: (payload: Record<string, unknown>) => void }) {
  const config = formConfig(section);
  const [form, setForm] = useState<Record<string, string | boolean>>(() => initialForm(section, row));
  const titleValue = String(form.title || "");

  useEffect(() => {
    if (row) setForm(initialForm(section, row));
  }, [row, section]);

  useEffect(() => {
    if ("slug" in form && titleValue) setForm((current) => ({ ...current, slug: slugify(titleValue) }));
  }, [titleValue]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(formToPayload(section, form));
  }

  return (
    <>
      <div className="admin-title"><div><h1>{row ? config.editTitle : config.newTitle}</h1><p>{config.help}</p></div><button className="admin-badge" onClick={onCancel}>Kembali & Batal</button></div>
      <form className="form-layout" onSubmit={submit}>
        <div className="form-grid">
          {config.fields.map((field) => <Field key={field.name} label={field.label} wide={field.wide}>{renderInput(field, form[field.name], (value) => setForm((current) => ({ ...current, [field.name]: value })))}</Field>)}
        </div>
        <div className="form-actions"><button className="btn btn-white" type="button" onClick={onCancel}>Kembali</button><button className="btn btn-primary" disabled={loading} type="submit"><Save size={15} />{loading ? "Menyimpan..." : config.submit}</button></div>
      </form>
    </>
  );
}

function Settings({ loading, onRefresh }: { loading: boolean; onRefresh: () => void }) {
  return <div className="settings-stack"><div className="admin-title"><div><h1>Status Sistem & Sinkronisasi Website</h1><p>Pantau status sambungan data dan segarkan tampilan website publik.</p></div></div><div className="admin-grid"><article className="admin-card"><h3>Sambungan Penyimpanan Data</h3><p>Status Sambungan: <strong>{hasSupabaseEnv() ? "Terhubung Online" : "Mode Penyimpanan Lokal"}</strong></p><p>Seluruh artikel, ulasan, dan galeri yang Anda kelola akan otomatis terpublikasi ke website utama.</p></article><article className="admin-card"><h3>Keamanan Akun Pengelola</h3><p>Akses masuk khusus staf administrasi resmi Qonsulin.id yang terdaftar.</p><p>Gunakan tombol Log Out di bilah navigasi kiri jika telah selesai mengelola konten.</p></article></div><article className="admin-card"><h3>Privasi & Keamanan Konten</h3><p>Halaman pengelola ini bersifat rahasia dan terlindungi dari pencarian umum. Hanya konten dengan status <strong>Terbit</strong> yang akan tayang di website publik.</p></article><article className="admin-card"><h3>Segarkan Data Website</h3><p>Gunakan tombol di bawah untuk memuat ulang data konten terbaru di halaman pengelola ini.</p><button className="btn btn-primary" disabled={loading} onClick={onRefresh}><RefreshCw size={15} />{loading ? "Memuat..." : "Segarkan Data Konten"}</button></article><article className="admin-card"><h3>Daftar Modul Konten Tersedia</h3><div className="table-checks">{["Artikel & Blog", "Aktivitas Komunitas", "Ulasan Klien", "Ebook Edukasi", "Dokumentasi Galeri", "Tayangan Video", "Profil Pendamping"].map((table) => <code key={table}>{table}</code>)}</div></article></div>;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`field ${wide ? "wide" : ""}`}><span>{label}</span>{children}</label>;
}

type FieldDef = { name: string; label: string; type?: "text" | "url" | "textarea" | "select" | "date" | "datetime-local" | "number" | "checkbox" | "tags" | "markdown" | "image"; wide?: boolean; required?: boolean; options?: Array<[string, string]> };

function ImageUploadInput({ value, setValue }: { value: string; setValue: (val: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData }).catch(() => null);
      if (res?.ok) {
        const data = await res.json();
        if (data.ok && data.url) {
          setValue(data.url);
          return;
        }
      }

      // Base64 Data URL fallback for instant preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setValue(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setValue(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
      setDragOver(false);
    }
  };

  return (
    <div 
      style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]); }}
    >
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input type="text" required={false} value={value} onChange={(event) => setValue(event.target.value)} placeholder="Unggah file gambar via tombol atau tempel URL/path gambar" style={{ flex: 1, border: dragOver ? "2px dashed var(--admin-primary)" : undefined }} />
        <span>atau</span>
        <label className="btn btn-white" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          {uploading ? "Mengunggah..." : "Pilih File Gambar"}
          <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploading} onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
        </label>
      </div>
      {value && <div style={{ marginTop: "0.5rem" }}><img src={value} alt="Preview" style={{ maxHeight: "120px", borderRadius: "8px", border: "1px solid #ddd", objectFit: "cover" }} /></div>}
    </div>
  );
}

function renderInput(field: FieldDef, value: string | boolean | undefined, setValue: (value: string | boolean) => void) {
  if (field.type === "markdown") return <RichTextEditor value={String(value || "")} onChange={(val) => setValue(val || "")} />;
  if (field.type === "image") return <ImageUploadInput value={String(value || "")} setValue={(v) => setValue(v)} />;
  if (field.type === "textarea") return <textarea required={field.required} value={String(value || "")} onChange={(event) => setValue(event.target.value)} />;
  if (field.type === "select") return <select required={field.required} value={String(value || field.options?.[0]?.[0] || "")} onChange={(event) => setValue(event.target.value)}>{field.options?.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select>;
  if (field.type === "checkbox") return <input type="checkbox" checked={Boolean(value)} onChange={(event) => setValue(event.target.checked)} />;
  return <input type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "datetime-local" ? "datetime-local" : field.type === "url" ? "url" : "text"} required={field.required} value={String(value || "")} onChange={(event) => setValue(event.target.value)} />;
}

function formConfig(section: Exclude<Section, "dashboard" | "settings">) {
  const commonStatus: FieldDef = { name: "status", label: "Status Publikasi", type: "select", options: [["draft", "Draft"], ["published", "Published"], ["archived", "Archived"]] };
  const configs = {
    posts: { newTitle: "Tulis Artikel Baru", editTitle: "Sunting Artikel", help: "Tulis artikel seputar kesehatan mental, edukasi, dan inspirasi.", submit: "Simpan & Publikasikan", fields: [{ name: "title", label: "Judul Artikel *", required: true }, { name: "slug", label: "Tautan Pendek Web (Otomatis dari Judul)" }, { name: "cover_image_url", label: "Foto Sampul Utama", type: "image" }, { name: "category", label: "Kategori Artikel" }, { name: "tags", label: "Kata Kunci / Tagar (pisahkan dengan koma)" }, commonStatus, { name: "seo_title", label: "Judul untuk Google (Mesin Pencari)" }, { name: "seo_description", label: "Deskripsi Singkat di Google", type: "textarea" }, { name: "excerpt", label: "Ringkasan Singkat Artikel *", type: "textarea", required: true, wide: true }, { name: "content", label: "Isi Lengkap Artikel *", type: "markdown", required: true, wide: true }] },
    activities: { newTitle: "Tambah Aktivitas", editTitle: "Sunting Aktivitas", help: "Publikasikan agenda seminar, bimbingan mahasiswa, atau kegiatan komunitas.", submit: "Simpan Aktivitas", fields: [{ name: "title", label: "Judul Kegiatan *", required: true }, { name: "type", label: "Kategori Acara" }, { name: "date", label: "Tanggal Pelaksanaan" }, { name: "image_url", label: "Foto / Dokumentasi", type: "image" }, { name: "source_url", label: "Tautan Berita / Referensi", type: "url" }, commonStatus, { name: "description", label: "Keterangan Kegiatan", type: "textarea", wide: true }] },
    testimonials: { newTitle: "Tambah Testimonial", editTitle: "Sunting Testimonial", help: "Gunakan persona anonim dan jangan unggah identitas asli klien.", submit: "Simpan Testimonial", fields: [{ name: "persona", label: "Persona Anonim *", required: true }, { name: "context", label: "Kategori Layanan" }, commonStatus, { name: "quote", label: "Isi Testimoni Klien *", type: "textarea", required: true, wide: true }] },
    "lead-magnets": { newTitle: "Tambah Ebook Edukasi", editTitle: "Sunting Ebook Edukasi", help: "Kelola panduan gratis / ebook untuk pembaca.", submit: "Simpan Ebook", fields: [{ name: "title", label: "Judul Ebook *", required: true }, { name: "file_url", label: "Tautan Berkas Ebook / PDF", type: "url" }, { name: "cta_label", label: "Teks Tombol (Misal: Unduh Gratis)" }, commonStatus, { name: "description", label: "Ringkasan Ebook", type: "textarea", wide: true }] },
    galleries: { newTitle: "Tambah Dokumentasi Galeri", editTitle: "Sunting Dokumentasi Galeri", help: "Kelola dokumentasi foto acara dan kegiatan QONSULIN.ID.", submit: "Simpan Galeri", fields: [{ name: "title", label: "Judul Acara *", required: true }, { name: "slug", label: "Tautan Web (Otomatis dari Judul)" }, { name: "event_date", label: "Tanggal Acara", type: "date" }, { name: "cover_image_url", label: "Foto Sampul Acara", type: "image" }, { name: "source_url", label: "Tautan Sumber Tambahan", type: "url" }, commonStatus, { name: "description", label: "Keterangan Acara", type: "textarea", wide: true }] },
    streaming: { newTitle: "Tambah Video Edukasi", editTitle: "Sunting Video Edukasi", help: "Kelola tayangan video edukasi dan rekaman siaran.", submit: "Simpan Video", fields: [{ name: "title", label: "Judul Video *", required: true }, { name: "slug", label: "Tautan Web (Otomatis dari Judul)" }, { name: "video_url", label: "Tautan Video YouTube / Rekaman *", type: "url", required: true }, { name: "thumbnail_url", label: "Foto Sampul Video", type: "image" }, { name: "source_label", label: "Sumber Siaran (Misal: YouTube)" }, { name: "stream_type", label: "Jenis Siaran", type: "select", options: [["offline", "Video Rekaman"], ["live", "Sedang Tayang (Live)"], ["upcoming", "Jadwal Tayang Mendatang"]] }, { name: "published_at", label: "Tanggal Terbit", type: "date" }, { name: "live_at", label: "Jadwal Mulai Tayang", type: "datetime-local" }, { name: "sort_order", label: "Urutan Tampil", type: "number" }, commonStatus, { name: "is_featured", label: "Tampilkan di Halaman Utama (Unggulan)", type: "checkbox" }, { name: "description", label: "Keterangan Video", type: "textarea", wide: true }] },
    companions: { newTitle: "Tambah Profil Pendamping", editTitle: "Sunting Profil Pendamping", help: "Kelola profil rekan pendamping yang tampil di website QONSULIN.ID.", submit: "Simpan Profil", fields: [{ name: "name", label: "Nama Lengkap & Gelar *", required: true }, { name: "role", label: "Profesi / Peran *", required: true }, { name: "badge", label: "Kategori Layanan (Badge)" }, { name: "credential", label: "Latar Belakang Pendidikan Singkat" }, { name: "image_url", label: "Foto Profil", type: "image" }, { name: "languages", label: "Bahasa yang Dikuasai" }, { name: "sort_order", label: "Urutan Tampil", type: "number" }, commonStatus, { name: "cta_enabled", label: "Tampilkan Tombol Konsultasi WhatsApp", type: "checkbox" }, { name: "preview", label: "Ringkasan Singkat di Kartu Depan", type: "textarea", wide: true }, { name: "description", label: "Profil & Latar Belakang Lengkap", type: "textarea", wide: true }] }
  } satisfies Record<Exclude<Section, "dashboard" | "settings">, { newTitle: string; editTitle: string; help: string; submit: string; fields: FieldDef[] }>;
  return configs[section];
}

function collectionConfig(section: Exclude<Section, "dashboard" | "settings">) {
  const statusCell = (status: CmsStatus) => <td><span className={`status ${status}`}>{status}</span></td>;
  const configs = {
    posts: { title: "Manajemen Artikel & Blog", subtitle: "Koleksi tulisan edukasi kesehatan mental dan bacaan kawan cerita.", button: "Tulis Artikel Baru", columns: ["Judul Artikel", "Kategori", "Tautan Web", "Status"], render: (row: AnyRow) => { const post = row as BlogPost; return <><td><strong>{post.title}</strong></td><td>{post.category}</td><td>/{post.slug}</td>{statusCell(post.status)}</>; } },
    activities: { title: "Aktivitas & Kegiatan Komunitas", subtitle: "Daftar agenda seminar, program edukasi mahasiswa, dan kampanye digital.", button: "Tambah Aktivitas", columns: ["Judul Kegiatan", "Kategori", "Tanggal", "Status"], render: (row: AnyRow) => { const item = row as ActivityItem; return <><td><strong>{item.title}</strong></td><td>{item.type}</td><td>{item.date || "-"}</td>{statusCell(item.status)}</>; } },
    testimonials: { title: "Ulasan & Testimoni", subtitle: "Daftar testimoni aman yang dipublikasikan.", button: "Tambah Testimoni", columns: ["Nama Samaran", "Kategori", "Kutipan", "Status"], render: (row: AnyRow) => { const item = row as Testimonial; return <><td><strong>{item.persona}</strong></td><td>{item.context || "-"}</td><td>{item.quote.slice(0, 64)}...</td>{statusCell(item.status)}</>; } },
    "lead-magnets": { title: "Ebook & Panduan Edukasi", subtitle: "Panduan dan checklist gratis untuk pembaca website.", button: "Tambah Ebook", columns: ["Judul", "Tombol", "Berkas", "Status"], render: (row: AnyRow) => { const item = row as LeadMagnet; return <><td><strong>{item.title}</strong></td><td>{item.cta_label}</td><td>{item.file_url ? "Tersedia" : "-"}</td>{statusCell(item.status)}</>; } },
    galleries: { title: "Dokumentasi Galeri", subtitle: "Dokumentasi foto dan liputan kegiatan QONSULIN.ID.", button: "Tambah Galeri", columns: ["Judul Acara", "Tautan Web", "Foto", "Status"], render: (row: AnyRow) => { const item = row as GalleryEvent; return <><td><strong>{item.title}</strong></td><td>/{item.slug || "-"}</td><td>{item.media_count || 0}</td>{statusCell(item.status)}</>; } },
    streaming: { title: "Tayangan Video", subtitle: "Koleksi video edukasi, rekaman siaran, dan informasi tayangan langsung.", button: "Tambah Video", columns: ["Judul Video", "Jenis Siaran", "Sumber", "Status"], render: (row: AnyRow) => { const item = row as StreamingVideo; return <><td><strong>{item.title}</strong></td><td>{item.stream_type === "live" ? "Live" : item.stream_type === "upcoming" ? "Jadwal" : "Rekaman"}</td><td>{item.source_label || "-"}</td>{statusCell(item.status)}</>; } },
    companions: { title: "Kelola Profil Pendamping", subtitle: "Daftar profil pendamping yang tampil di halaman depan website.", button: "Tambah Pendamping", columns: ["Nama & Gelar", "Profesi / Peran", "Urutan", "Status"], render: (row: AnyRow) => { const item = row as CompanionProfile; return <><td><strong>{item.name}</strong></td><td>{item.role}</td><td>{item.sort_order || 0}</td>{statusCell(item.status)}</>; } }
  };
  return configs[section];
}

function initialForm(section: Exclude<Section, "dashboard" | "settings">, row: AnyRow | null) {
  const fields = formConfig(section).fields;
  return fields.reduce<Record<string, string | boolean>>((acc, field) => {
    const value = row ? (row as unknown as Record<string, unknown>)[field.name] : undefined;
    if (field.name === "status") acc[field.name] = String(value || "draft");
    else if (field.name === "stream_type") acc[field.name] = String(value || "offline");
    else if (field.name === "sort_order") acc[field.name] = String(value ?? 0);
    else if (field.name === "is_featured") acc[field.name] = Boolean(value);
    else if (field.name === "cta_enabled") acc[field.name] = value === undefined ? true : Boolean(value);
    else if (field.name === "tags") acc[field.name] = Array.isArray(value) ? value.join(", ") : String(value || "");
    else if (["focus_tags", "education", "focus", "experience"].includes(field.name)) acc[field.name] = Array.isArray(value) ? value.join("\n") : String(value || "");
    else acc[field.name] = String(value || "");
    return acc;
  }, {});
}

function formToPayload(section: Exclude<Section, "dashboard" | "settings">, form: Record<string, string | boolean>) {
  const payload: Record<string, unknown> = { ...form };
  if ("tags" in payload) payload.tags = splitList(String(payload.tags || ""));
  for (const key of ["focus_tags", "education", "focus", "experience"]) {
    if (key in payload) payload[key] = splitList(String(payload[key] || ""), section === "companions");
  }
  if ("sort_order" in payload) payload.sort_order = Number(payload.sort_order || 0);
  if ("is_featured" in payload) payload.is_featured = Boolean(payload.is_featured);
  if ("cta_enabled" in payload) payload.cta_enabled = Boolean(payload.cta_enabled);
  if ((section === "posts" || section === "galleries" || section === "streaming") && !payload.slug && payload.title) payload.slug = slugify(String(payload.title));
  return payload;
}

function splitList(value: string, multilineOnly = false) {
  return value
    .split(multilineOnly ? /\n/ : /\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePayload(section: Exclude<Section, "dashboard" | "settings">, payload: Record<string, unknown>, now: string) {
  const normalized: Record<string, unknown> = { ...payload, updated_at: now };
  if (section === "posts" && normalized.status === "published" && !normalized.published_at) normalized.published_at = now;
  return normalized;
}

function parseSection(value?: string): Section {
  return sections.some((item) => item.id === value) ? value as Section : "dashboard";
}

function isCollection(section: Section): section is Exclude<Section, "dashboard" | "settings"> {
  return section !== "dashboard" && section !== "settings";
}

function previewEnabled() {
  if (typeof window === "undefined") return false;
  return process.env.NEXT_PUBLIC_ENABLE_ADMIN_PREVIEW === "true" && new URLSearchParams(window.location.search).get("preview") === "1";
}

function adminPath(section: Section, mode: Mode = "list", id?: string) {
  const base = typeof window !== "undefined" && window.location.hostname.startsWith("admin.") ? "" : "/admin";
  if (section === "dashboard") return `${base}/dashboard`;
  if (mode === "new") return `${base}/${section}/new`;
  if (mode === "edit" && id) return `${base}/${section}/${id}/edit`;
  return `${base}/${section}`;
}

function publicHref(section: Exclude<Section, "dashboard" | "settings">, row: AnyRow) {
  if (section === "posts") return `/artikel/${(row as BlogPost).slug}`;
  if (section === "galleries") return `/galeri/${(row as GalleryEvent).slug || row.id}`;
  if (section === "streaming") return (row as StreamingVideo).video_url || "/streaming";
  if (section === "companions") return "/#pendamping";
  return publicSiteUrl;
}

function rowsOrFallback<T>(result: { data: T[] | null; error: unknown }, fallback: T[]) {
  return result.error || !result.data ? fallback : result.data;
}
