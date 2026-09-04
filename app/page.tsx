import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ExternalLink, Heart, MessageCircle, ShieldCheck } from "lucide-react";
import { Footer, Header } from "@/components/PublicChrome";
import { audiences, companionServices, faq, problems, services, whatsappUrl, why } from "@/lib/data";
import { getPublishedActivities, getPublishedCompanions, getPublishedLeadMagnets, getPublishedTestimonials, type ActivityItem, type CompanionProfile } from "@/lib/cms";

export const revalidate = 0;

const culture = [
  ["H", "Human First", "Kami mengutamakan manusia dengan empati, rasa hormat, dan tanpa menghakimi."],
  ["E", "Excellence", "Memberikan layanan yang profesional, berkualitas, dan terus berkembang."],
  ["A", "Accountability", "Bertanggung jawab atas setiap tindakan, menjaga kerahasiaan, dan menepati komitmen."],
  ["R", "Respect", "Menghargai keberagaman, pendapat, dan perjalanan hidup setiap orang."],
  ["T", "Together", "Bertumbuh bersama sebagai tim, relawan, psikolog, dan komunitas."]
];

export default async function HomePage() {
  const [activities, testimonials, leadMagnets, companions] = await Promise.all([
    getPublishedActivities(),
    getPublishedTestimonials(),
    getPublishedLeadMagnets(),
    getPublishedCompanions()
  ]);

  return (
    <main className="site-shell">
      <Header active="/" />
      <section className="hero"><div className="container hero-grid"><div><div className="eyebrows"><span className="pill">Heart by Heart Support</span><span className="pill muted">Online Portal Resmi</span></div><h1>Ruang Aman untuk <span className="accent">Berbagi Cerita</span>, Menemukan Dukungan, dan Melangkah Lebih Baik</h1><p className="lead">QONSULIN.ID hadir sebagai jembatan empati yang membantu mahasiswa, anak muda, dan masyarakat umum menemukan ruang aman untuk bercerita, mengeksplorasi kecemasan, serta terhubung dengan pendamping, konselor, atau tenaga profesional tepercaya yang paling pas sesuai krisis kebutuhan batinmu.</p><div className="hero-actions"><a className="btn btn-primary" href={whatsappUrl}><MessageCircle size={18} />Mulai Konsultasi (WhatsApp)</a><a className="btn btn-soft" href="/asesmen">Coba Pemetaan Kebutuhan Awal<ArrowRight size={16} /></a><a className="btn btn-white" href="/layanan">Pelajari Layanan</a></div><div className="trust-row"><span><CheckCircle2 size={14} />Komitmen Menjaga Privasi Cerita</span><span><CheckCircle2 size={14} />Pendamping Terkurasi & Lolos Screening</span><span><CheckCircle2 size={14} />Bukan Layanan Darurat Kesehatan</span></div></div><div className="reflection" aria-label="QONSULIN reflection card"><div className="reflection-top"><div style={{ display: "flex", gap: ".75rem", alignItems: "center" }}><span className="reflection-icon">Q</span><div><h4>QONSULIN Reflection</h4><small>SESSION DIAGRAM REVIEW</small></div></div><span className="pill">Active Sessions</span></div><div className="reflection-quote">&quot;Akhirnya ada satu ruang di mana aku bisa menumpahkan beban skripsi tanpa dicap malas oleh lingkungan...&quot;<br /><small>- Mahasiswa Akhir S1, Bukittinggi</small></div><div className="steps">{[["1", "Isi formulir obrolan awal", "1 Menit"], ["2", "Pencocokan pendamping yang pas", "Proses"], ["3", "Mulai obrolan tulus bertahap", "Daring"]].map(([n, t, s]) => <div className="mini-step" key={n}><strong>{n}</strong><span>{t}</span><small>{s}</small></div>)}</div></div></div></section>
      <section className="section"><div className="container problem-grid"><div className="section-head"><span className="tag">Problem Statement</span><h2>Tidak Semua Orang Punya Tempat Aman untuk Bercerita</h2><p>Tekanan hidup era modern seperti tuntutan akademik, kompetisi profesional, hingga masalah hubungan interpersonal sering meninggalkan residu emosional tinggi. Sayangnya, hambatan sosial dan psikologis sering menghalangi kita untuk mendapat bantuan pertama.</p></div><div className="card-grid">{problems.map(([title, copy]) => <article className="card" key={title}><span className="mark">!</span><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>
      <section className="section"><div className="container bridge"><div className="bridge-note"><h4>QONSULIN.ID Jembatan Asesmen</h4><p>Kami menguraikan keluhan batinmu secara moderat dan bertahap melalui filter kualifikasi pendampingan kami.</p><ul><li><b>Tahap 1: Teman Dengar</b><br />Murni menyalurkan unek-unek stres harian.</li><li><b>Tahap 2: Bimbingan Konselor</b><br />Fokus penyelesaian hambatan karir, stres skripsi, atau relasi.</li><li><b>Tahap 3: Rujukan Psikolog Mitra</b><br />Arahan konsultasi lanjutan bersama profesional berwenang jika diperlukan.</li></ul></div><div className="section-head"><span className="tag">The Bridge Approach</span><h2>Hadir sebagai Jembatan Empati Awal yang Terarah</h2><p>QONSULIN.ID memosisikan diri sebagai penyaring pertama. Kami mengerti bahwa tidak semua masalah emosional memerlukan biaya mahal dengan langsung melompat ke psikiater.</p><a className="btn btn-soft" href="/tentang-kami">Filosofi Heart by Heart<ArrowRight size={16} /></a></div></div></section>
      <section className="section culture-section"><div className="container"><div className="section-head center"><span className="tag">Qonsulin Culture</span><h2>Qonsulin Culture: HEART</h2><p>Nilai kerja yang menjaga QONSULIN.ID tetap manusiawi, aman, dan bertumbuh bersama komunitas.</p></div><div className="culture-grid">{culture.map(([letter, title, body]) => <article className="culture-card" key={letter}><span><Heart size={22} fill="currentColor" /></span><h3>{letter} - {title}</h3><p>{body}</p></article>)}</div><div className="culture-photo"><div className="culture-photo-frame"><img src="/qonsulin-culture-heart.jpg" alt="Tim QONSULIN.ID membawa buku bersama komunitas" /></div><div className="culture-photo-copy"><span className="culture-kicker">WARISAN</span><h3><span>Berakar dari empati Indonesia,</span><strong>berdampak bagi dunia</strong></h3></div></div></div></section>
      <section className="section companion-section"><div className="container"><div className="section-head center"><span className="tag">Jasa Menemani</span><h2>Layanan Companion untuk Hari-hari yang Butuh Ditemani</h2><p>Pilihan pendampingan non-medis untuk menemani aktivitas, percakapan, belajar, atau kebutuhan praktis harian dengan batas aman yang jelas.</p></div><div className="companion-grid">{companionServices.map((service) => { const Icon = service.icon; return <article className="card companion-card" key={service.title}><span className="icon-tile"><Icon size={26} /></span><h3>{service.title}</h3><p>{service.description}</p><small>{service.suitableFor}</small><a className="btn btn-soft companion-service-cta" href={companionServiceWhatsAppUrl(service.title)}><MessageCircle size={17} />Pilih Jasa Ini</a></article>; })}</div></div></section>
      <section className="section companion-team" id="pendamping"><div className="container"><div className="section-head center"><span className="tag">Pendamping QONSULIN.ID</span><h2>Kenali Pendamping QONSULIN.ID</h2><p>Tim pendamping hadir untuk membantu kamu menemukan ruang aman untuk berbagi cerita, memahami kebutuhan awal, dan mendapatkan arahan yang sesuai.</p></div><div className="companion-people-grid">{companions.map((person) => <CompanionProfileCard key={person.id} person={person} />)}</div></div></section>
      <section className="section"><div className="container"><div className="section-head center"><h2>Urai Kusut Pikiran Berdasarkan Kebutuhanmu</h2></div><div className="services-grid">{services.slice(0, 6).map((service) => { const Icon = service.icon; return <article className="card service-card" key={service.id}><div><span className="icon-tile"><Icon size={28} /></span><h3>{service.title}</h3><p>{service.description}</p></div><a href={`/layanan#${service.id}`} className="btn btn-soft">Detail Selengkapnya<ArrowRight size={15} /></a></article>; })}</div></div></section>
      <section className="section flow-band"><div className="container"><div className="section-head center"><h2>Alur Konsultasi Sederhana & Ramah</h2><p>Langkah dibuat singkat agar kamu tidak merasa harus menyiapkan semuanya sendirian.</p></div><div className="flow-grid">{["Pilih Topik Kebutuhan", "Hubungi Admin", "Asesmen Awal Ringan", "Dipasangkan Partner", "Sesi Mandiri Online", "Refleksi & Rujukan"].map((step, i) => <article className="flow-card" key={step}><span className="pill">0{i + 1}</span><h3>{step}</h3><p>{i === 0 ? "Mulai dari yang paling terasa berat hari ini." : "Admin membantu menjaga ritme agar tetap aman dan jelas."}</p></article>)}</div></div></section>
      <section className="section"><div className="container"><div className="section-head center"><h2>Untuk Siapa QONSULIN.ID Cocok?</h2></div><div className="why-grid">{audiences.map((item) => <article className="card" key={item}><ShieldCheck color="var(--color-brand)" /><h3>{item}</h3></article>)}</div></div></section>
      <section className="section activity-section"><div className="container"><div className="section-head center"><span className="tag">Aktivitas Awal</span><h2>Aktivitas Edukasi & Ruang Cerita</h2><p>Catatan kegiatan yang dipublikasikan sebagai bukti aktivitas bertahap QONSULIN.ID.</p></div><div className="activity-showcase">{activities.slice(0, 1).map((activity) => <ActivityCard activity={activity} key={activity.id} />)}</div></div></section>
      {testimonials.length > 0 && <section className="section"><div className="container"><div className="section-head center"><span className="tag">Testimonial Anonim</span><h2>Cerita Mereka yang Pernah Didampingi</h2></div><div className="services-grid">{testimonials.slice(0, 3).map((item) => <article className="card" key={item.id}><p style={{ fontStyle: "italic" }}>&quot;{item.quote}&quot;</p><h3>{item.persona}</h3>{item.context && <small>{item.context}</small>}</article>)}</div></div></section>}
      {leadMagnets.length > 0 && <section className="section"><div className="container"><div className="section-head center"><span className="tag">Lead Magnet</span><h2>Panduan Gratis untuk Langkah Awal</h2></div><div className="services-grid">{leadMagnets.slice(0, 2).map((item) => <article className="card service-card" key={item.id}><div><h3>{item.title}</h3><p>{item.description}</p></div>{item.file_url && <a className="btn btn-soft" href={item.file_url}>{item.cta_label}<ArrowRight size={15} /></a>}</article>)}</div></div></section>}
      <section className="section"><div className="container"><div className="section-head center"><h2>Kenapa Memilih Pendampingan QONSULIN.ID?</h2></div><div className="why-grid">{why.map(([title, copy]) => <article className="card" key={title}><h3>{title}</h3><p>{copy}</p></article>)}</div><article className="card" style={{ marginTop: "1.5rem", background: "var(--color-brand-soft)" }}><AlertTriangle color="var(--color-brand-strong)" /><h3>Bukan Ruang Penanganan Gawat Darurat Medis Akut</h3><p>Jika kamu atau orang terdekat berada dalam kondisi darurat keselamatan, segera hubungi layanan darurat setempat atau profesional kesehatan berwenang.</p></article></div></section>
      <section className="section"><div className="container"><div className="section-head center"><h2>Ada Pertanyaan yang Sering Diajukan?</h2></div><div className="faq-list">{faq.map(([q, a]) => <details className="faq-item" key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>
      <section className="section cta"><div className="container bridge"><div><h2>Mulai dari Cerita, Lanjut ke Arah yang Lebih Jelas</h2><p>Hubungi admin QONSULIN.ID untuk memulai pemetaan kebutuhan awal yang ringan, manusiawi, dan rahasia.</p></div><div className="hero-actions"><a className="btn btn-white" href={whatsappUrl}>Hubungi Admin QONSULIN.ID</a><a className="btn" style={{ color: "white", borderColor: "rgba(255,255,255,.35)" }} href="/layanan">Eksplorasi Layanan Detail</a></div></div></section>
      <Footer />
    </main>
  );
}

function CompanionProfileCard({ person }: { person: CompanionProfile }) {
  const preview = person.preview || person.description || "";
  const focusTags = person.focus_tags || [];
  const initials = person.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
  return (
    <article className="companion-profile-card">
      <div className="companion-profile-media">{person.image_url ? <img src={person.image_url} alt={`Profil ${person.name}`} /> : <div className="companion-profile-placeholder"><span>{initials}</span></div>}</div>
      <div className="companion-profile-body">
        <span className="profile-badge">{person.badge}</span>
        <h3>{person.name}</h3>
        <p className="profile-credential">{person.credential}</p>
        <p className="profile-preview">{preview}</p>
        <div className="profile-focus"><b>Fokus Pendampingan</b><div>{focusTags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}{focusTags.length > 3 && <span>+{focusTags.length - 3} lainnya</span>}</div></div>
        <div className="profile-actions">
          <details className="profile-reveal">
            <summary>Baca Selengkapnya <ArrowRight size={16} /></summary>
            <div className="profile-details"><p>{person.description}</p><ProfileBlock title="Latar pendidikan" items={person.education || []} /><ProfileBlock title="Fokus pendampingan" items={person.focus || []} /><ProfileBlock title="Pengalaman/pelatihan" items={person.experience || []} />{person.languages && <p><b>Bahasa layanan:</b> {person.languages}</p>}</div>
          </details>
          {person.cta_enabled && <a className="btn btn-primary companion-consult" href={whatsappUrl}><MessageCircle size={18} />Mulai Konsultasi</a>}
        </div>
      </div>
    </article>
  );
}

function companionServiceWhatsAppUrl(serviceTitle: string) {
  const message = `Halo Admin QONSULIN.ID, saya ingin menggunakan layanan Jasa Menemani: ${serviceTitle}. Mohon info jadwal, alur, dan biaya layanannya.`;
  return `https://wa.me/6285191020288?text=${encodeURIComponent(message)}`;
}

function ProfileBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return <div><b>{title}</b><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}

function ActivityCard({ activity }: { activity: ActivityItem }) {
  const webinarDescription = "Webinar: Quarter Life Crisis di Era AI Di umur sekarang, pernah nggak sih kamu merasa bingung harus mulai dari mana? Takut tertinggal, takut gagal, bahkan takut...";
  const rawDescription = activity.description?.replace(/^#\s*/, "");
  const description = rawDescription && !rawDescription.toLowerCase().startsWith("social proof aktivitas komunitas") ? rawDescription : webinarDescription;

  return (
    <article className="activity-card">
      <div className="activity-card-media">{activity.image_url ? <img src={activity.image_url} alt={`Poster kegiatan: ${activity.title}`} /> : <MessageCircle size={62} />}</div>
      <div className="activity-card-body">
        <div className="activity-meta"><span>{activity.type}</span><span><CalendarDays size={16} />{activity.date || "Agenda QONSULIN"}</span></div>
        <span className="activity-status">Telah Berlangsung</span>
        <h3>{activity.title}</h3>
        <p>{description}</p>
        <div className="activity-actions">
          <a className="activity-read" href="/kegiatan">Baca Selengkapnya</a>
          {activity.source_url && <a className="activity-doc" href={activity.source_url} target="_blank" rel="noreferrer">Lihat Dokumentasi <ExternalLink size={16} /></a>}
        </div>
      </div>
    </article>
  );
}
