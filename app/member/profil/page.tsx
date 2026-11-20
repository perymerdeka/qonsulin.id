"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { AvatarStudio } from "@/components/AvatarStudio";
import { MemberSettingsShell } from "@/components/MemberSettingsShell";
import { updateMemberProfile } from "@/lib/member-auth";
import { defaultAvatarConfig, sanitizeAlias, type MemberProfile } from "@/lib/member";

function ProfileForm({ profile, onProfileUpdated }: { profile: MemberProfile; onProfileUpdated: (profile: MemberProfile) => void }) {
  const [alias, setAlias] = useState(profile.alias);
  const [bio, setBio] = useState(profile.bio || "");
  const [avatar, setAvatar] = useState(profile.avatar_config || defaultAvatarConfig);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const cleanAlias = sanitizeAlias(alias);
      const result = await updateMemberProfile({ alias: cleanAlias, bio: bio.trim(), avatar_config: avatar });
      if (result.ok) {
        setAlias(cleanAlias);
        onProfileUpdated({ ...profile, alias: cleanAlias, bio: bio.trim(), avatar_config: avatar });
      }
      setFeedback({ ok: result.ok, message: result.message || (result.ok ? "Profil dan avatar berhasil diperbarui." : "Profil belum berhasil diperbarui.") });
    } finally {
      setSaving(false);
    }
  }

  return <>
    <header className="member-section-heading"><div><p className="member-eyebrow">PENGATURAN</p><h1>Profil & Avatar</h1><p>Atur nama samaran dan avatar yang tampil di suratmu. Identitas pribadimu tetap terlindungi.</p></div></header>
    <form onSubmit={saveProfile} className="member-settings-card member-profile-form">
      <label className="field"><span>Nama samaran</span><input required minLength={3} maxLength={30} value={alias} onChange={(event) => setAlias(event.target.value)} disabled={saving} /><small>3-30 karakter: huruf, angka, spasi, tanda hubung, atau garis bawah.</small></label>
      <label className="field"><span>Bio singkat (opsional)</span><textarea maxLength={160} rows={3} value={bio} onChange={(event) => setBio(event.target.value)} disabled={saving} /><small>Maksimal 160 karakter.</small></label>
      <fieldset disabled={saving} className="member-avatar-field"><legend>Avatar emosi</legend><AvatarStudio value={avatar} onChange={setAvatar} alias={alias} /></fieldset>
      {feedback && <p role="status" className={`member-settings-feedback${feedback.ok ? " is-success" : " is-error"}`}>{feedback.ok && <CheckCircle2 size={17} />}{feedback.message}</p>}
      <div className="member-settings-actions"><button type="submit" className="btn btn-primary" disabled={saving}><Save size={17} />{saving ? "Menyimpan..." : "Simpan Perubahan"}</button></div>
    </form>
  </>;
}

export default function EditProfilePage() {
  return <MemberSettingsShell activeItem="profile">{({ profile, onProfileUpdated }) => <ProfileForm profile={profile} onProfileUpdated={onProfileUpdated} />}</MemberSettingsShell>;
}
