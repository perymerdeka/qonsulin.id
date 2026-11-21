"use client";

import { useEffect, useState } from "react";
import { Mail, ShieldCheck, Sparkles } from "lucide-react";
import { MemberSettingsShell } from "@/components/MemberSettingsShell";
import { PackageOrderButton } from "@/components/PackageOrderButton";
import { formatRupiah, getActivePackages, getMembershipBenefits, type ConsultationPackage } from "@/lib/packages";

const orderStatusLabels = { pending: "Menunggu verifikasi", active: "Aktif", rejected: "Ditolak", expired: "Kedaluwarsa" };

export default function MemberAccountPage() {
  const [packages, setPackages] = useState<ConsultationPackage[]>([]);
  useEffect(() => {
    let active = true;
    void getActivePackages().then((items) => { if (active) setPackages(items); });
    return () => { active = false; };
  }, []);

  return <MemberSettingsShell activeItem="account">{({ profile, quota, orders, email }) => {
    const effectiveTier = quota?.tier || profile.tier;
    return <>
    <header className="member-section-heading"><div><p className="member-eyebrow">PERSURATAN</p><h1>Membership Kamu</h1><p>Informasi akun dan kuota surat dalam satu tempat.</p></div></header>
    <section className="member-account-summary">
      <article className="member-settings-card"><Mail size={21} /><h2>Akun masuk</h2><p>{email || "Email akun tidak tersedia"}</p><small>Email ini tidak ditampilkan ke member lain.</small></article>
      <article className="member-settings-card"><ShieldCheck size={21} /><h2>{effectiveTier === "premium" ? "Premium Account" : "Free Account"}</h2>{quota ? <><p>{quota.limit === -1 ? "Kuota surat publik tanpa batas." : `Sisa ${quota.remaining} dari ${quota.limit} surat publik bulan ini.`}</p><small>Surat khusus: {quota.special_letter_limit === -1 ? "tanpa batas" : `${quota.special_letter_remaining} dari ${quota.special_letter_limit}`} surat tersisa bulan ini.</small></> : <p>Kuota belum dapat dimuat.</p>}</article>
    </section>
    <section className="member-settings-card"><h2>Pesanan terakhir</h2>{orders.length === 0 ? <p>Belum ada pesanan paket.</p> : <ul className="member-account-orders">{orders.map((order) => <li key={order.id}><div><strong>{order.package_name}</strong><small>{formatRupiah(order.amount)}{order.expires_at ? ` - Berakhir ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(order.expires_at))}` : ""}</small></div><span>{orderStatusLabels[order.status]}</span></li>)}</ul>}</section>
    <section><h2 className="member-settings-section-title"><Sparkles size={21} /> Upgrade Membership</h2><div className="member-account-packages">{packages.filter((item) => item.code === "member_premium").map((item) => <article className="member-settings-card" key={item.code}><h3>{item.name}</h3><p className="member-package-price">{formatRupiah(item.price)}</p><p>{item.description}</p><ul>{getMembershipBenefits(item).map((feature) => <li key={feature}>{feature}</li>)}</ul>{effectiveTier === "premium" ? <p>Paket Premium kamu sudah aktif.</p> : <PackageOrderButton pkg={item} premium />}</article>)}</div></section>
  </>; }}</MemberSettingsShell>;
}
