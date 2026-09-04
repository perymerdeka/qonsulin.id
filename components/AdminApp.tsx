"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookOpenText, CalendarCheck2, CalendarPlus2, Database, Eye, FilePlus2, FileText, Globe2, ImagePlus, Images, LayoutDashboard, LogOut, MessageCircle, MessageSquarePlus, MessageSquareQuote, PenLine, Radio, RefreshCw, Save, Settings as SettingsIcon, ShieldCheck, Trash2, Upload, UsersRound } from "lucide-react";
import { Brand } from "@/components/PublicChrome";
import { fallbackActivities, fallbackCompanions, fallbackGalleryEvents, fallbackLeadMagnets, fallbackPosts, fallbackStreamingVideos, fallbackTestimonials, slugify, type ActivityItem, type BlogPost, type CmsStatus, type CompanionProfile, type GalleryEvent, type LeadMagnet, type StreamingVideo, type Testimonial } from "@/lib/cms";
import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
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
  { id: "activities", label: "Social Proof Aktivitas", icon: CalendarCheck2 },
  { id: "testimonials", label: "Ulasan Testimonial", icon: MessageSquareQuote },
  { id: "lead-magnets", label: "Lead Magnet Ebook", icon: FileText },
  { id: "galleries", label: "Galeri Kegiatan", icon: Images },
  { id: "streaming", label: "Streaming", icon: Radio },
  { id: "companions", label: "Kelola Pendamping", icon: UsersRound },
  { id: "settings", label: "Integrasi Database", icon: SettingsIcon }
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

      const supabase = getSupabaseClient();
      if (supabase) {
        const [posts, activities, testimonials, leads, galleries, streaming, companions] = await Promise.all([
          supabase.from("blog_posts").select("*").order("created_at", { ascending: false }),
          supabase.from("activities").select("*").order("created_at", { ascending: false }),
          supabase.from("testimonials").select("*").order("created_at", { ascending: false }),
          supabase.from("lead_magnets").select("*").order("created_at", { ascending: false }),
          supabase.from("gallery_events").select("*, gallery_media(count)").order("created_at", { ascending: false }),
          supabase.from("streaming_videos").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
          supabase.from("companions").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false })
        ]);
        setStore({
          posts: rowsOrFallback(posts, fallbackStore.posts),
          activities: rowsOrFallback(activities, fallbackStore.activities),
          testimonials: rowsOrFallback(testimonials, fallbackStore.testimonials),
          "lead-magnets": rowsOrFallback(leads, fallbackStore["lead-magnets"]),
          galleries: rowsOrFallback(galleries, fallbackStore.galleries).map((event: any) => ({ ...event, media_count: Array.isArray(event.gallery_media) ? event.gallery_media[0]?.count || 0 : event.media_count || 0 })),
          streaming: rowsOrFallback(streaming, fallbackStore.streaming),
          companions: rowsOrFallback(companions, fallbackStore.companions)
        });
        return;
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
      setMessage("Mode Testing Lokal Aktif: Data yang Anda tambah/sunting tersimpan secara lokal di browser Anda.");
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
    const table = tableBySection[sectionId];
    const normalized = normalizePayload(sectionId, payload, now);
    const supabase = getSupabaseClient();

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

      if (supabase && !saved) {
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          const result = id
            ? await supabase.from(table).update(normalized).eq("id", id).select().single()
            : await supabase.from(table).insert([normalized]).select().single();
          if (!result.error) saved = result.data as AnyRow;
        }
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

      setMessage(isLocalMode ? "Konten berhasil disimpan (Mode Testing Lokal - Tersimpan di Browser)." : "Konten berhasil disimpan ke Supabase.");
      navigate(sectionId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan data CMS.");
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

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        const { error } = await supabase.from(tableBySection[sectionId]).delete().eq("id", id);
        if (!error) {
          setStore((current) => {
            const newStore = { ...current, [sectionId]: current[sectionId].filter((row) => row.id !== id) };
            if (typeof window !== "undefined") localStorage.setItem("qonsulin_local_cms_store", JSON.stringify(newStore));
            return newStore;
          });
          setMessage("Konten berhasil dihapus.");
          return;
        }
      }
    }

    setStore((current) => {
      const newStore = { ...current, [sectionId]: current[sectionId].filter((row) => row.id !== id) };
      if (typeof window !== "undefined") localStorage.setItem("qonsulin_local_cms_store", JSON.stringify(newStore));
      return newStore;
    });
    setMessage("Konten berhasil dihapus (Mode Testing Lokal).");
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
            <button className="admin-badge" onClick={async () => { const supabase = getSupabaseClient(); await supabase?.auth.signOut(); await fetch("/api/admin/logout", { method: "POST" }); setLoggedIn(false); }}><LogOut size={15} />Keluar Akun (Log Out)</button>
          </div>
        </aside>
        <section className="admin-main">
          {message && <div className="admin-alert">{message}</div>}
          {section === "dashboard" && <Dashboard store={store} setSection={(next) => navigate(next)} />}
          {section === "settings" && <Settings loading={loading} onRefresh={loadAll} />}
          {isCollection(section) && mode === "list" && <Collection section={section} rows={store[section]} openNew={() => navigate(section, "new")} openEdit={(id) => navigate(section, "edit", id)} onDelete={(id) => remove(section, id)} />}
          {isCollection(section) && mode !== "list" && <CmsForm section={section} row={editingRow} loading={loading} onCancel={() => navigate(section)} onSubmit={(payload) => save(section, payload, editingRow?.id)} />}
          <footer className="admin-footer">Qonsulin.id Admin Dashboard Panel v1.0 - Sumatra Barat</footer>
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
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signInWithPassword({ email: normalizedEmail, password: normalizedPassword }).catch(() => null);
      }
      onLogin();
      return;
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: normalizedPassword }).catch(() => ({} as any));
      if (!error) {
        const { data: adminUser } = await supabase.from("admin_users").select("email,is_active").eq("email", normalizedEmail).maybeSingle();
        if (adminUser && adminUser.is_active !== false) {
          await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }) }).catch(() => null);
          onLogin();
          return;
        }
        await supabase.auth.signOut();
      }
    }

    const serverBody = serverResponse ? await serverResponse.json().catch(() => null) as null | { message?: string } : null;
    setMessage(serverBody?.message || "Supabase belum dikonfigurasi atau credential admin belum cocok.");
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
          <div className="live"><ShieldCheck size={16} />{supabaseReady ? "Supabase Live Connected" : "Supabase Preview Mode"}</div>
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
      <div className="admin-title"><div><h1>Ringkasan Statistik Qonsulin.id</h1><p>Pantau dan sunting seluruh konten pertumbuhan dari menu administrasi rahasia ini.</p></div><span className="admin-badge"><Database size={15} />Database Terkoneksi: Supabase Postgres</span></div>
      <div className="stats">{stats.map((item) => {
        const Icon = item.icon;
        return <button className="stat" key={item.label} onClick={() => setSection(item.id)}><span className={`stat-icon ${item.tone}`}><Icon size={16} /></span><small>{item.label}</small><h3>{item.number}</h3><p>{item.help}</p></button>;
      })}</div>
      <div className="admin-grid">
        <article className="admin-card"><h3>Aksi Singkat CMS</h3><div className="quick">{quickActions.map(([label, id, Icon]) => <button key={label} onClick={() => setSection(id as Section)}><Icon size={16} />{label}</button>)}</div></article>
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
  return <div className="settings-stack"><div className="admin-title"><div><h1>Koneksi & Integrasi Database Qonsulin</h1><p>Periksa koneksi Supabase, otorisasi admin, dan isolasi indeks mesin pencari.</p></div></div><div className="admin-grid"><article className="admin-card"><h3>Keadaan Server & API</h3><p>Sambungan API Supabase: <strong>{hasSupabaseEnv() ? "Live Connected" : "Blocked"}</strong></p><p>Target CRUD: <code>NEXT_PUBLIC_SUPABASE_URL</code> project baru.</p><p>Write admin server membutuhkan <code>SUPABASE_SERVICE_ROLE_KEY</code> di environment production.</p></article><article className="admin-card"><h3>Keamanan Staf Terdaftar</h3><p>Login panel memakai credential admin yang dikunci pada server, lalu cookie admin mengakses API CRUD internal.</p><p>Jika memakai Supabase Auth juga, email <code>halo@qonsulin.id</code> tetap perlu aktif di tabel <code>admin_users</code>.</p></article></div><article className="admin-card"><h3>Protokol Sitemap & Keamanan Mesin Pencari</h3><p>Subdomain admin <code>https://admin.qonsulin.id</code> tidak boleh masuk sitemap publik. Halaman admin memakai <code>noindex,nofollow</code> dan public site hanya membaca konten <code>published</code>.</p></article><article className="admin-card"><h3>Redeploy Public Website</h3><p>Gunakan setelah publish artikel/galeri baru agar sitemap public ikut diperbarui. Tombol ini hanya disiapkan sebagai placeholder sampai deploy hook production tersedia.</p><button className="btn btn-primary" disabled={loading} onClick={onRefresh}><RefreshCw size={15} />{loading ? "Memuat..." : "Refresh Data CMS"}</button></article><article className="admin-card"><h3>Checklist Tabel CMS</h3><div className="table-checks">{["admin_users", "blog_posts", "activities", "testimonials", "lead_magnets", "gallery_events", "gallery_media", "streaming_videos", "companions"].map((table) => <code key={table}>{table}</code>)}</div></article></div>;
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
  const commonStatus: FieldDef = { name: "status", label: "Status Publisitas", type: "select", options: [["draft", "Draft"], ["published", "Published"], ["archived", "Archived"]] };
  const configs = {
    posts: { newTitle: "Tulis Artikel Baru", editTitle: "Sunting Artikel", help: "Posisikan tulisan berbobot kesehatan batin non-klinis.", submit: "Submit Artikel", fields: [{ name: "title", label: "Judul Artikel *", required: true }, { name: "slug", label: "Slug URL Jalur (Opsional - otomatis dari Judul)" }, { name: "cover_image_url", label: "Cover Image URL Gambar", type: "image" }, { name: "category", label: "Kategori Kumpulan" }, { name: "tags", label: "Tags Tagar (pisahkan koma)" }, commonStatus, { name: "seo_title", label: "SEO Title Tag" }, { name: "seo_description", label: "SEO Meta Description", type: "textarea" }, { name: "excerpt", label: "Ringkasan Pendek (Excerpt) *", type: "textarea", required: true, wide: true }, { name: "content", label: "Bodi Konten Artikel (Markdown Format) *", type: "markdown", required: true, wide: true }] },
    activities: { newTitle: "Tambah Aktivitas", editTitle: "Sunting Aktivitas", help: "Publikasikan bukti riil seminar, program edukasi mahasiswa, dan kampanye digital.", submit: "Simpan Aktivitas", fields: [{ name: "title", label: "Judul Kegiatan *", required: true }, { name: "type", label: "Tipe Cara" }, { name: "date", label: "Tanggal Pelaksanaan" }, { name: "image_url", label: "Image URL", type: "image" }, { name: "source_url", label: "Source URL", type: "url" }, commonStatus, { name: "description", label: "Deskripsi", type: "textarea", wide: true }] },
    testimonials: { newTitle: "Tambah Testimonial", editTitle: "Sunting Testimonial", help: "Gunakan persona anonim dan jangan unggah identitas asli klien.", submit: "Simpan Testimonial", fields: [{ name: "persona", label: "Persona Anonim *", required: true }, { name: "context", label: "Konteks" }, commonStatus, { name: "quote", label: "Isi Testimonial *", type: "textarea", required: true, wide: true }] },
    "lead-magnets": { newTitle: "Tambah Lead Magnet", editTitle: "Sunting Lead Magnet", help: "Kelola ebook/checklist gratis untuk funnel edukasi.", submit: "Simpan Lead Magnet", fields: [{ name: "title", label: "Judul *", required: true }, { name: "file_url", label: "File URL", type: "url" }, { name: "cta_label", label: "CTA Label" }, commonStatus, { name: "description", label: "Deskripsi", type: "textarea", wide: true }] },
    galleries: { newTitle: "Tambah Kegiatan Galeri", editTitle: "Sunting Galeri", help: "Kelola event dokumentasi. Media detail memakai tabel gallery_media.", submit: "Simpan Galeri", fields: [{ name: "title", label: "Judul Event *", required: true }, { name: "slug", label: "Slug (Opsional - otomatis dari Judul)" }, { name: "event_date", label: "Tanggal Event", type: "date" }, { name: "cover_image_url", label: "Cover Image URL", type: "image" }, { name: "source_url", label: "Source URL", type: "url" }, commonStatus, { name: "description", label: "Deskripsi", type: "textarea", wide: true }] },
    streaming: { newTitle: "Tambah Video Streaming", editTitle: "Sunting Video Streaming", help: "Simpan URL video dan thumbnail saja. Jangan paste iframe/raw HTML.", submit: "Simpan Video", fields: [{ name: "title", label: "Title *", required: true }, { name: "slug", label: "Slug (Opsional - otomatis dari Title)" }, { name: "video_url", label: "Video URL *", type: "url", required: true }, { name: "thumbnail_url", label: "Thumbnail URL", type: "image" }, { name: "source_label", label: "Source Label" }, { name: "stream_type", label: "Stream Type", type: "select", options: [["offline", "Video Offline/Rekaman"], ["live", "Live Streaming"], ["upcoming", "Jadwal Live Streaming"]] }, { name: "published_at", label: "Published At", type: "date" }, { name: "live_at", label: "Live At", type: "datetime-local" }, { name: "sort_order", label: "Sort Order", type: "number" }, commonStatus, { name: "is_featured", label: "Featured video", type: "checkbox" }, { name: "description", label: "Description", type: "textarea", wide: true }] },
    companions: { newTitle: "Tambah Pendamping", editTitle: "Sunting Pendamping", help: "Kelola profil pendamping yang tampil di section Kenali Pendamping QONSULIN.ID.", submit: "Simpan Pendamping", fields: [{ name: "name", label: "Nama lengkap dan gelar *", required: true }, { name: "role", label: "Role yang ingin ditampilkan *", required: true }, { name: "badge", label: "Badge/Kategori kartu" }, { name: "credential", label: "Credential pendidikan singkat" }, { name: "image_url", label: "Image URL Profil", type: "image" }, { name: "languages", label: "Bahasa layanan" }, { name: "sort_order", label: "Urutan tampil", type: "number" }, commonStatus, { name: "cta_enabled", label: "CTA diarahkan ke WhatsApp admin", type: "checkbox" }, { name: "preview", label: "Preview singkat di kartu", type: "textarea", wide: true }, { name: "description", label: "Profil & Latar Belakang", type: "textarea", wide: true }] }
  } satisfies Record<Exclude<Section, "dashboard" | "settings">, { newTitle: string; editTitle: string; help: string; submit: string; fields: FieldDef[] }>;
  return configs[section];
}

function collectionConfig(section: Exclude<Section, "dashboard" | "settings">) {
  const statusCell = (status: CmsStatus) => <td><span className={`status ${status}`}>{status}</span></td>;
  const configs = {
    posts: { title: "Manajemen Artikel & Blog", subtitle: "Koleksi tulisan penunjang SEO dan edukasi kawan cerita.", button: "Tulis Artikel Baru", columns: ["Judul Artikel", "Kategori", "Slug URL", "Status"], render: (row: AnyRow) => { const post = row as BlogPost; return <><td><strong>{post.title}</strong></td><td>{post.category}</td><td>/{post.slug}</td>{statusCell(post.status)}</>; } },
    activities: { title: "Social Proof & Aktivitas Komunitas", subtitle: "Publikasikan bukti riil seminar, program edukasi mahasiswa, dan kampanye digital Anda.", button: "Tambah Aktivitas", columns: ["Judul Kegiatan", "Tipe Cara", "Tanggal", "Status"], render: (row: AnyRow) => { const item = row as ActivityItem; return <><td><strong>{item.title}</strong></td><td>{item.type}</td><td>{item.date || "-"}</td>{statusCell(item.status)}</>; } },
    testimonials: { title: "Ulasan Testimonial", subtitle: "Kelola testimoni anonim yang aman dipublikasikan.", button: "Tambah Testimonial", columns: ["Persona", "Konteks", "Kutipan", "Status"], render: (row: AnyRow) => { const item = row as Testimonial; return <><td><strong>{item.persona}</strong></td><td>{item.context || "-"}</td><td>{item.quote.slice(0, 64)}...</td>{statusCell(item.status)}</>; } },
    "lead-magnets": { title: "Lead Magnet Ebook", subtitle: "Panduan gratis dan checklist untuk funnel edukasi.", button: "Tambah Lead Magnet", columns: ["Judul", "CTA", "File", "Status"], render: (row: AnyRow) => { const item = row as LeadMagnet; return <><td><strong>{item.title}</strong></td><td>{item.cta_label}</td><td>{item.file_url ? "Tersedia" : "-"}</td>{statusCell(item.status)}</>; } },
    galleries: { title: "Galeri Kegiatan", subtitle: "Dokumentasi event dan media kegiatan QONSULIN.ID.", button: "Tambah Kegiatan", columns: ["Judul", "Slug", "Media", "Status"], render: (row: AnyRow) => { const item = row as GalleryEvent; return <><td><strong>{item.title}</strong></td><td>/{item.slug || "-"}</td><td>{item.media_count || 0}</td>{statusCell(item.status)}</>; } },
    streaming: { title: "Streaming", subtitle: "Video edukasi, rekaman kegiatan, dan informasi live streaming.", button: "Tambah Video", columns: ["Title", "Stream Type", "Source", "Status"], render: (row: AnyRow) => { const item = row as StreamingVideo; return <><td><strong>{item.title}</strong></td><td>{item.stream_type}</td><td>{item.source_label || "-"}</td>{statusCell(item.status)}</>; } },
    companions: { title: "Kelola Pendamping", subtitle: "Profil pendamping yang tampil di landing page QONSULIN.ID.", button: "Tambah Pendamping", columns: ["Nama", "Role", "Urutan", "Status"], render: (row: AnyRow) => { const item = row as CompanionProfile; return <><td><strong>{item.name}</strong></td><td>{item.role}</td><td>{item.sort_order || 0}</td>{statusCell(item.status)}</>; } }
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
