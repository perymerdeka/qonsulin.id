"use client";

import { useEffect, useState } from "react";
import { Mail, ShieldCheck, Sparkles } from "lucide-react";
import { MemberSettingsShell } from "@/components/MemberSettingsShell";
import { PackageOrderButton } from "@/components/PackageOrderButton";
import { formatRupiah, getActivePackages, type ConsultationPackage } from "@/lib/packages";

const orderStatusLabels = { pending: "Menunggu verifikasi", active: "Aktif", rejected: "Ditolak", expired: "Kedaluwarsa" };

export default function MemberAccountPage() {
  const [packages, setPackages] = useState<ConsultationPackage[]>([]);
  useEffect(() => {
    let active = true;
    void getActivePackages().then((items) => { if (active) setPackages(items); });
    return () => { active = false; };
  }, []);

  return <MemberSettingsShell activeItem="account">{({ profile, quota, orders, email }) => <>
    <header className="member-section-heading"><div><p className="member-eyebrow">SETTINGS</p><h1>Account</h1><p>Informasi akun, kuota surat, dan paketmu dalam satu tempat.</p></div></header>
    <section className="member-account-summary">
      <article className="member-settings-card"><Mail size={21} /><h2>Akun masuk</h2><p>{email || "Email akun tidak tersedia"}</p><small>Email ini tidak ditampilkan ke member lain.</small></article>
      <article className="member-settings-card"><ShieldCheck size={21} /><h2>{profile.tier === "premium" ? "Premium Account" : "Free Account"}</h2><p>{profile.tier === "premium" ? "Kuota surat publik tanpa batas." : `Sisa ${quota?.remaining ?? 0} dari ${quota?.limit ?? 3} surat publik bulan ini.`}</p><small>Surat privat memerlukan paket pendampingan yang sesuai.</small></article>
    </section>
    <section className="member-settings-card"><h2>Pesanan terakhir</h2>{orders.length === 0 ? <p>Belum ada pesanan paket.</p> : <ul className="member-account-orders">{orders.map((order) => <li key={order.id}><div><strong>{order.package_name}</strong><small>{formatRupiah(order.amount)}{order.expires_at ? ` - Berakhir ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(order.expires_at))}` : ""}</small></div><span>{orderStatusLabels[order.status]}</span></li>)}</ul>}</section>
    <section><h2 className="member-settings-section-title"><Sparkles size={21} /> Pilihan paket</h2><div className="member-account-packages">{packages.filter((item) => item.price > 0).map((item) => <article className="member-settings-card" key={item.code}><h3>{item.name}</h3><p className="member-package-price">{formatRupiah(item.price)}</p><p>{item.description}</p><ul>{item.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>{profile.tier === "premium" && item.category === "membership" ? <p>Paket Premium kamu sudah aktif.</p> : <PackageOrderButton pkg={item} premium={item.category === "membership"} />}</article>)}</div></section>
  </>}</MemberSettingsShell>;
}
