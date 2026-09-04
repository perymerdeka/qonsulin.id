import Link from "next/link";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Menu, MessageCircle, Music2, Phone, Youtube, type LucideIcon } from "lucide-react";
import { whatsappUrl } from "@/lib/data";

const nav = [["Beranda", "/"], ["Layanan", "/layanan"], ["Edukasi", "/artikel"], ["Tentang", "/tentang-kami"], ["FAQ", "/faq"]] as const;

const footerLinks = {
  Layanan: [["Layanan", "/layanan"], ["Konsultan", "/konsultan"], ["Pemetaan Awal", "/asesmen"], ["Dukungan Mahasiswa", "/mahasiswa"]],
  Edukasi: [["Artikel", "/artikel"], ["Galeri Kegiatan", "/galeri"], ["Streaming QONSULIN", "/streaming"]],
  Perusahaan: [["Tentang Kami", "/tentang-kami"], ["Kegiatan QONSULIN", "/kegiatan"], ["Kontak", "/kontak"]]
} as const;

const helpLinks = [["FAQ", "/faq"], ["WhatsApp Admin", whatsappUrl], ["Email", "mailto:halo@qonsulin.id"]] as const;

const contactItems = [
  { label: "PT Voluntrip Minang Mendunia\nBukittinggi,\nSumatera Barat,\nIndonesia", href: "https://www.google.com/maps/search/?api=1&query=PT%20Voluntrip%20Minang%20Mendunia%20Bukittinggi", icon: MapPin },
  { label: "halo@qonsulin.id", href: "mailto:halo@qonsulin.id", icon: Mail },
  { label: "+6285191020288", href: whatsappUrl, icon: Phone }
] as const;

const socialLinks = [
  { label: "qonsulin.id", href: "https://www.instagram.com/qonsulin.id", icon: Instagram },
  { label: "qonsulin", href: "https://www.youtube.com/@qonsulin", icon: Youtube },
  { label: "qonsulin.id", href: "https://www.tiktok.com/@qonsulin.id", icon: Music2 },
  { label: "qonsulin.id", href: "https://www.facebook.com/qonsulin.id", icon: Facebook },
  { label: "qonsulin", href: "https://www.linkedin.com/company/qonsulin", icon: Linkedin }
] as const;

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="QONSULIN.ID beranda">
      <img src="/qonsulin-logo.png" alt="QONSULIN.ID" />
      <span>QONSULIN<span>.ID</span></span>
    </Link>
  );
}

export function Header({ active = "/" }: { active?: string }) {
  return (
    <header className="topbar">
      <div className="container nav">
        <Brand />
        <nav className="navlinks" aria-label="Navigasi utama">
          {nav.map(([label, href]) => <NavLink key={href} label={label} href={href} active={active} />)}
        </nav>
        <details className="mobile-nav">
          <summary><Menu size={18} />Menu</summary>
          <nav aria-label="Navigasi mobile">
            {nav.map(([label, href]) => <NavLink key={href} label={label} href={href} active={active} />)}
            <a href={whatsappUrl} target="_blank" rel="noreferrer">Mulai Konsultasi</a>
          </nav>
        </details>
        <a className="btn btn-primary nav-cta" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={17} />Mulai Konsultasi</a>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-main">
        <div className="container footer-grid">
          <div className="footer-intro">
            <Brand />
            <p>Platform konsultasi online dan pendampingan mental wellness dengan pendekatan empati <strong>Heart by Heart.</strong></p>
            <p>QONSULIN.ID berada di bawah naungan <strong>PT Voluntrip Minang Mendunia.</strong></p>
          </div>
          <FooterCol title="Layanan" links={footerLinks.Layanan} />
          <FooterCol title="Edukasi" links={footerLinks.Edukasi} />
          <FooterCol title="Perusahaan" links={footerLinks.Perusahaan} />
          <FooterCol title="Bantuan" links={helpLinks} />
          <FooterContact />
          <FooterSocial />
        </div>
      </div>
      <div className="footer-legal">
        <div className="container">
          <p className="footer-disclaimer"><strong>Pemberitahuan Penting (Disclaimer):</strong> QONSULIN.ID bukan kanal penanganan krisis akut. Jika Anda sedang dalam kondisi tidak aman, memiliki pikiran untuk menyakiti diri sendiri, atau berada dalam kegawatdaruratan medis, mohon hubungi bantuan medis nasional (119), pusat kesehatan jiwa, atau segera datangi fasilitas IGD rumah sakit terdekat.</p>
          <div className="footer-bottom"><span>© 2026 QONSULIN.ID. Hak Cipta Dilindungi Undang-Undang.</span><span>Portal Resmi QONSULIN.ID - Built with Heart by Heart</span></div>
        </div>
      </div>
    </footer>
  );
}

function NavLink({ label, href, active }: { label: string; href: string; active: string }) {
  return <Link href={href} className={active === href ? "active" : ""}>{label}</Link>;
}

function FooterCol({ title, links }: { title: string; links: readonly (readonly [string, string])[] }) {
  return <div className="footer-col"><h4>{title}</h4>{links.map(([label, href]) => <p key={href}><Link href={href}>{label}</Link></p>)}</div>;
}

function FooterContact() {
  return <div className="footer-col footer-contact"><h4>Kontak Resmi</h4><div className="footer-contact-list">{contactItems.map((item) => <FooterIconLink key={item.label} {...item} />)}</div></div>;
}

function FooterSocial() {
  return <div className="footer-col footer-social"><h4>Media Sosial</h4><div className="footer-social-list">{socialLinks.map((item) => <FooterIconLink key={`${item.label}-${item.href}`} {...item} />)}</div></div>;
}

function FooterIconLink({ label, href, icon: Icon }: { label: string; href: string; icon: LucideIcon }) {
  const isExternal = href.startsWith("http");
  return (
    <a className="footer-icon-link" href={href} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noreferrer" : undefined}>
      <span className="footer-icon"><Icon size={19} /></span>
      <span>{label.split("\n").map((line) => <span key={line}>{line}</span>)}</span>
    </a>
  );
}
