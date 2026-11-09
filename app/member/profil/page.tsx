"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header, Footer } from "@/components/PublicChrome";
import { getCurrentMemberProfile, updateMemberProfile } from "@/lib/member-auth";
import { AvatarStudio } from "@/components/AvatarStudio";
import { MemberProfile, AvatarConfig, defaultAvatarConfig } from "@/lib/member";
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react";

export default function EditProfilePage() {
  const router = useRouter();
  const [alias, setAlias] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<AvatarConfig>(defaultAvatarConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const p = await getCurrentMemberProfile();
        if (!active) return;
        if (!p) {
          router.replace("/member/masuk");
          return;
        }
        setAlias(p.alias || "");
        setBio(p.bio || "");
        if (p.avatar_config) setAvatar(p.avatar_config);
      } catch (err) {
        console.warn("[EditProfile] Failed to load session:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setSaving(true);

    try {
      const res = await updateMemberProfile({
        alias: alias.trim(),
        avatar_config: avatar,
        bio: bio.trim()
      });

      if (!res.ok) {
        setErrorMsg(res.message || "Gagal memperbarui profil.");
      } else {
        setSuccessMsg("Profil dan avatar berhasil diperbarui!");
        setTimeout(() => {
          window.location.href = "/member";
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kendala saat menyimpan profil.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="site-shell">
        <Header active="/member" />
        <section className="section container" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <p style={{ color: "var(--color-muted)" }}>Memuat profil...</p>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="site-shell">
      <Header active="/member" />
      <section className="section container" style={{ maxWidth: 760, margin: "0 auto", padding: "2.5rem 1.25rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <Link href="/member" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", color: "var(--color-brand-strong)", fontSize: "0.88rem", fontWeight: 700 }}>
            <ArrowLeft size={16} /> Kembali ke Ruang Member
          </Link>
          <h1 style={{ fontSize: "1.75rem", color: "var(--color-ink)", marginTop: "0.5rem" }}>
            Pengaturan Profil & Avatar
          </h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
            Sesuaikan nama samaran dan ekspresi avatar yang mewakili suasana hatimu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem", padding: "2rem" }}>
          <label className="field">
            <span>Nama Samaran (Alias Publik)</span>
            <input
              type="text"
              required
              maxLength={30}
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
            />
            <small style={{ color: "var(--color-muted)", fontSize: "0.75rem" }}>Minimal 3 karakter, hanya huruf, angka, tanda hubung atau garis bawah.</small>
          </label>

          <label className="field">
            <span>Bio Singkat (Opsional)</span>
            <textarea
              maxLength={160}
              rows={3}
              placeholder="Ceritakan sedikit tentang dirimu atau hal yang sedang kamu lalui..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <small style={{ color: "var(--color-muted)", fontSize: "0.75rem" }}>Maksimal 160 karakter</small>
          </label>

          <div>
            <h3 style={{ fontSize: "1rem", color: "var(--color-brand-strong)", marginBottom: "0.75rem" }}>
              Sesuaikan Avatar Emosi
            </h3>
            <AvatarStudio value={avatar} onChange={setAvatar} alias={alias} />
          </div>

          {errorMsg && (
            <div style={{ padding: "0.7rem 1rem", background: "#fee2e2", color: "#991b1b", borderRadius: "8px", fontSize: "0.85rem" }}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ padding: "0.7rem 1rem", background: "#dcfce7", color: "#166534", borderRadius: "8px", fontSize: "0.85rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <CheckCircle2 size={16} /> {successMsg}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", borderTop: "1px solid var(--color-rule)", paddingTop: "1.25rem" }}>
            <Link href="/member" className="btn btn-white">
              Batal
            </Link>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
              <Save size={16} /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </section>
      <Footer />
    </main>
  );
}