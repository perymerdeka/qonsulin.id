import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, BookOpenText, CalendarDays, CheckCircle2, HeartHandshake, MessageCircle, Radio } from "lucide-react";
import { Footer, Header } from "@/components/PublicChrome";
import { faq, services, supportTiers, whatsappUrl } from "@/lib/data";
import { getPublishedActivities, getPublishedGalleryEvents, getPublishedPosts, getPublishedStreamingVideos, plainExcerpt, type ActivityItem, type BlogPost, type GalleryEvent, type StreamingVideo } from "@/lib/cms";

type PageProps = { params: Promise<{ slug: string }> };

const pageCopy: Record<string, { eyebrow: string; title: string; body: string }> = {
  layanan: { eyebrow: "Layanan Resmi Terintegrasi", title: "Pusat Layanan Pendampingan Mental Wellness", body: "Menyediakan ruang berekspresi jujur bebas dari stigma, terstruktur khusus untuk kebutuhan hidup mahasiswa, profesional muda, dan keluarga." },
  konsultan: { eyebrow: "Kredibilitas Tim Pendamping", title: "Transparansi Kompetensi Teman Cerita & Konselor", body: "Menyelaraskan tingkat kedalaman krisis emosionalmu dengan keahlian yang tepat guna menjaga standar perlindungan yang aman, murah, dan humanis." },
  artikel: { eyebrow: "Edukasi Mental Wellness", title: "Katalog Artikel & Blog", body: "Koleksi tulisan penunjang SEO dan edukasi kawan cerita dengan bahasa ringan, aman, dan tidak mengklaim diagnosis klinis." },
  faq: { eyebrow: "Bantuan", title: "Pertanyaan yang Sering Diajukan", body: "Jawaban singkat tentang cara mulai berkonsultasi, batas layanan, dan bagaimana QONSULIN.ID menjaga privasi cerita." },
  kontak: { eyebrow: "Mulai Konsultasi", title: "Hubungi Admin QONSULIN.ID", body: "Awali dari pesan sederhana. Admin akan membantu memetakan kebutuhan awal dan langkah berikutnya." },
  asesmen: { eyebrow: "Pemetaan Awal", title: "Coba Pemetaan Kebutuhan Awal", body: "Gunakan halaman ini sebagai contoh alur asesmen ringan sebelum sesi. Pada integrasi Supabase, respons dapat disimpan sebagai intake form." },
  "tentang-kami": { eyebrow: "Sejarah Filosofi Kami", title: "Menembus Sekat Batin, Mendengar dari Hati", body: "Membangun jembatan empati murni berjenjang untuk menyelamatkan batin yang lelah sebelum memasuki fase krisis kritis." },
  mahasiswa: { eyebrow: "Dukungan Mahasiswa", title: "Dukungan untuk Mahasiswa yang Sedang Tertekan, Stuck Skripsi, atau Butuh Tempat Cerita", body: "QONSULIN.ID membantu mahasiswa menemukan ruang aman untuk bercerita, memahami tekanan yang sedang dialami, dan mendapatkan arahan awal yang lebih terarah." },
  kegiatan: { eyebrow: "Aktivitas Publik", title: "Kegiatan QONSULIN.ID", body: "Ikuti informasi kegiatan, edukasi, webinar, dan aktivitas QONSULIN.ID yang telah berlangsung maupun yang akan datang." },
  galeri: { eyebrow: "Dokumentasi", title: "Galeri Kegiatan QONSULIN.ID", body: "Kumpulan dokumentasi kegiatan, edukasi, webinar, dan kampanye QONSULIN.ID." },
  streaming: { eyebrow: "Konten Video", title: "Streaming QONSULIN.ID", body: "Temukan video edukasi, rekaman kegiatan, dan informasi live streaming QONSULIN.ID." }
};

export default async function PublicSubPage({ params }: PageProps) {
  const { slug } = await params;
  const copy = pageCopy[slug];
  if (!copy) notFound();

  const posts = slug === "artikel" || slug === "mahasiswa" ? await getPublishedPosts() : [];
  const activities = slug === "kegiatan" ? await getPublishedActivities() : [];
  const galleries = slug === "galeri" ? await getPublishedGalleryEvents() : [];
  const streaming = slug === "streaming" ? await getPublishedStreamingVideos() : [];

  return (
    <main className="site-shell">
      <Header active={getActivePath(slug)} />
      <section className="page-hero container"><span className="tag">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.body}</p></section>
      {slug === "layanan" && <ServicesPage />}
      {slug === "konsultan" && <ConsultantPage />}
      {slug === "artikel" && <ArticlePage posts={posts} />}
      {slug === "faq" && <FaqPage />}
      {slug === "kontak" && <ContactPage />}
      {slug === "asesmen" && <AssessmentPage />}
      {slug === "tentang-kami" && <AboutPage />}
      {slug === "mahasiswa" && <StudentPage posts={posts} />}
      {slug === "kegiatan" && <ActivitiesPage activities={activities} />}
      {slug === "galeri" && <GalleryPage galleries={galleries} />}
      {slug === "streaming" && <StreamingPage videos={streaming} />}
      <Footer />
    </main>
  );
}

function getActivePath(slug: string) {
  if (slug === "artikel" || slug === "galeri" || slug === "streaming" || slug === "kegiatan") return "/artikel";
  if (slug === "faq") return "/faq";
  if (slug === "layanan" || slug === "konsultan" || slug === "asesmen" || slug === "mahasiswa") return "/layanan";
  if (slug === "kontak") return "/kontak";
  return "/tentang-kami";
}

function ServicesPage() {
  const assessmentOptions = [
    ["Active Listener / Teman Dengar", "Tepat untuk melepaskan penat atau sementara, bad day harian, overthinking skripsi biasa, kebingungan karir ringan, atau sekadar butuh telinga netral untuk meluapkan emosi tanpa perlu kesimpulan penanganan medis."],
    ["Psikolog Klinis Profesional", "Diharuskan apabila ada indikasi kecenderungan membahayakan diri sendiri, keputusan mental berat berbulan-bulan yang mengganggu fungsi produktif dasar, delusi kronis, trauma masa lalu yang melumpuhkan, atau kecemasan medis akut."]
  ];
  const sessionSteps = [
    ["Pilih Subpaket Layanan", "Tinjau kecocokan gejala emosionalmu dengan list koping kami di bawah."],
    ["Konsultasi Ringan Khusus", "Kirim form pesan WhatsApp untuk divalidasi krisis batinnya oleh Admin."],
    ["Temu Temu Teman Dengar", "Berdiskusi langsung secara aman, privat, santai, dan penuh empati dari hati ke hati."]
  ];

  return (
    <>
      <section className="container service-directory">
        {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <article className={`service-route-card ${index % 2 === 0 ? "media-left" : "media-right"}`} id={service.id} key={service.id}>
                  <div className="service-route-icon"><Icon size={42} /><span>QONSULIN.ID</span></div>
                  <div className="service-route-body">
                    <span className="service-route-format">{service.format}</span>
                    <h2>{service.title}</h2>
                    <p>{service.description}</p>
                    <div className="service-route-fit"><strong>Layanan ini sangat cocok bagi kamu yang:</strong><div>{service.suitableFor.map((item) => <span key={item}><CheckCircle2 size={13} />{item}</span>)}</div></div>
                    <div className="service-route-footer"><small><b>Support focus:</b><br />{service.media}</small><a className="btn btn-primary" href={serviceWhatsAppUrl(service.title)}><MessageCircle size={15} />Diskusikan Kebutuhan Saya</a></div>
                  </div>
                </article>
              );
            })}
      </section>

      <section className="section service-assessment">
        <div className="container">
          <div className="section-head center"><span className="tag">Alokasi Asesmen Krisis</span><h2>Kapan Harus Memilih Teman Cerita vs Psikolog Klinis?</h2></div>
          <div className="service-assessment-grid">{assessmentOptions.map(([title, body], index) => <article className="service-assessment-card" key={title}><span className={index === 0 ? "amber" : "green"} /> <h3>{title}</h3><p>{body}</p></article>)}</div>
        </div>
      </section>

      <section className="section service-start">
        <div className="container service-start-panel">
          <div className="section-head center"><h2>Bagaimana Cara Memulai Sesi?</h2><p>Seluruh alur pendaftaran beroperasi menggunakan platform komunikasi WhatsApp yang efisien dan humanis.</p></div>
          <div className="service-start-grid">{sessionSteps.map(([title, body]) => <article className="service-start-card" key={title}><CheckCircle2 size={16} /><h3>{title}</h3><p>{body}</p></article>)}</div>
          <div className="service-start-actions"><a className="btn btn-white" href="/asesmen">Coba Pemetaan Kebutuhan Awal<ArrowRight size={15} /></a><a className="btn btn-primary" href={whatsappUrl}><MessageCircle size={15} />Hubungi Admin Layanan Sekarang</a></div>
        </div>
      </section>
    </>
  );
}

function serviceWhatsAppUrl(serviceTitle: string) {
  const message = `Halo Admin QONSULIN.ID, saya ingin berdiskusi tentang layanan ${serviceTitle}. Mohon bantu arahkan alur dan jadwal yang tersedia.`;
  return `https://wa.me/6285191020288?text=${encodeURIComponent(message)}`;
}

function ConsultantPage() {
  return (
    <>
      <section className="section"><div className="container"><div className="section-head center"><span className="tag">Tier of Support</span><h2>Tiga Pilihan Level Dukungan Sesuai Kebutuhanmu</h2><p>QONSULIN.ID membagi tingkatan tim pendamping berdasar latar akademis dan izin praktik secara jujur demi menghindari kebingungan klien.</p></div><div className="services-grid">{supportTiers.map(([tier, title, body]) => <article className="card" key={title}><span className="tag">{tier}</span><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>
      <section className="section flow-band"><div className="container"><div className="flow-grid">{["Dokumen", "Karakter", "Kode Etik", "Evaluasi"].map((item) => <article className="flow-card" key={item}><h3>{item}</h3><p>Setiap kandidat pendamping dan konselor melewati pemeriksaan dasar agar ruang cerita tetap aman.</p></article>)}</div></div></section>
    </>
  );
}

function ArticlePage({ posts }: { posts: BlogPost[] }) {
  return (
    <section className="container article-grid">
      {posts.map((post) => (
        <article className="article-card" key={post.slug}>
          <a className="article-card-media" href={`/artikel/${post.slug}`} aria-label={`Baca artikel ${post.title}`}>
            {post.cover_image_url ? <img src={post.cover_image_url} alt={post.title} /> : <BookOpenText size={44} />}
          </a>
          <div className="article-card-body">
            <div className="article-card-meta">
              <span>{post.category}</span>
              <span><CalendarDays size={14} />{formatArticleDate(post.published_at || post.created_at)}</span>
            </div>
            <h2><a href={`/artikel/${post.slug}`}>{post.title}</a></h2>
            <p>{plainExcerpt(post.excerpt || post.content)}</p>
            <div className="article-card-footer">
              <span>/{post.slug}</span>
              <a className="article-card-link" href={`/artikel/${post.slug}`}>Baca Artikel<ArrowRight size={15} /></a>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function formatArticleDate(value: string | null) {
  if (!value) return "QONSULIN.ID";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "QONSULIN.ID";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function StudentPage({ posts }: { posts: BlogPost[] }) {
  const related = posts.filter((post) => [post.category, post.title, post.excerpt, ...(post.tags || [])].join(" ").toLowerCase().match(/mahasiswa|akademik|skripsi|burnout/)).slice(0, 3);
  return <section className="section"><div className="container"><div className="services-grid">{[["Yang sering dirasakan", "overthinking skripsi, burnout akademik, tekanan keluarga, bingung mulai dari mana"], ["Untuk siapa halaman ini", "mahasiswa S1, mahasiswa S2/S3, mahasiswa akhir, mahasiswa yang butuh tempat cerita aman"], ["Layanan relevan", "Ruang Cerita Online, Konsultasi Akademik & Tekanan Skripsi, Konseling Online"]].map(([title, body]) => <article className="card" key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>{related.length > 0 && <div style={{ marginTop: "3rem" }}><div className="section-head"><span className="tag">Artikel Terkait</span><h2>Bacaan awal untuk mahasiswa</h2></div><div className="services-grid">{related.map((post) => <article className="card" key={post.id}><h3>{post.title}</h3><p>{plainExcerpt(post.excerpt)}</p><a className="btn btn-soft" href={`/artikel/${post.slug}`}>Baca Artikel</a></article>)}</div></div>}</div></section>;
}

function ActivitiesPage({ activities }: { activities: ActivityItem[] }) {
  return <section className="container service-list">{activities.length === 0 ? <article className="card">Kegiatan sedang disiapkan.</article> : activities.map((activity) => <article className="wide-service" key={activity.id}><div className="service-art">{activity.image_url ? <img src={activity.image_url} alt={activity.title} /> : <CheckCircle2 size={64} />}</div><div><span className="tag">{activity.type} · {activity.date || "Agenda"}</span><h2>{activity.title}</h2><p>{activity.description}</p>{activity.source_url && <a className="btn btn-soft" href={activity.source_url}>Lihat Detail<ArrowRight size={15} /></a>}</div></article>)}</section>;
}

function GalleryPage({ galleries }: { galleries: GalleryEvent[] }) {
  return <section className="container service-list">{galleries.length === 0 ? <article className="card">Media kegiatan sedang disiapkan.</article> : galleries.map((event) => <article className="wide-service" key={event.id}><div className="service-art">{event.cover_image_url ? <img src={event.cover_image_url} alt={event.title} /> : <CheckCircle2 size={64} />}</div><div><span className="tag">{event.media_count || 0} media</span><h2>{event.title}</h2><p>{event.description}</p><a className="btn btn-soft" href={`/galeri/${event.slug || event.id}`}>Lihat Galeri<ArrowRight size={15} /></a></div></article>)}</section>;
}

function StreamingPage({ videos }: { videos: StreamingVideo[] }) {
  return <section className="section"><div className="container"><div className="services-grid">{videos.length === 0 ? <article className="card"><Radio color="var(--color-brand)" /><h3>Video edukasi akan segera tersedia.</h3><p>Belum ada live streaming aktif saat ini. Ikuti kanal resmi QONSULIN.ID untuk mendapatkan informasi terbaru.</p><a className="btn btn-primary" href="https://www.youtube.com/@qonsulin">Kunjungi Channel YouTube QONSULIN.ID</a></article> : videos.map((video) => <article className="card service-card" key={video.id}><div><span className="tag">{video.source_label || "QONSULIN.ID"}</span><h3>{video.title}</h3><p>{video.description}</p></div><a className="btn btn-soft" href={video.video_url}>Tonton Video<ArrowRight size={15} /></a></article>)}</div></div></section>;
}

function FaqPage() {
  return <section className="section"><div className="container"><div className="faq-list">{faq.map(([q, a]) => <details className="faq-item" key={q} open><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>;
}

function ContactPage() {
  return <section className="section"><div className="container bridge"><article className="card"><h2>WhatsApp Admin</h2><p>Gunakan tombol ini untuk membuka format pesan konsultasi awal.</p><a className="btn btn-primary" href={whatsappUrl}>Hubungi Admin QONSULIN.ID<ArrowRight size={16} /></a></article><article className="card"><h2>Email</h2><p>halo@qonsulin.id</p><p>Sumatra Barat · Online first support</p></article></div></section>;
}

function AssessmentPage() {
  return <section className="section"><div className="container"><form className="form-layout"><div className="form-grid"><Field label="Nama Panggilan" placeholder="Nama atau inisial" /><Field label="Topik Utama" placeholder="Skripsi, relasi, burnout, keluarga..." /><Field wide label="Ceritakan singkat kebutuhanmu" placeholder="Tuliskan apa yang paling terasa berat hari ini." textarea /><Field label="Preferensi Sesi" placeholder="Online chat / call" /><Field label="Kontak WhatsApp" placeholder="08xxxxxxxxxx" /></div><div className="form-actions"><a className="btn btn-primary" href={whatsappUrl}>Lanjut via WhatsApp</a></div></form></div></section>;
}

function AboutPage() {
  const missions = [
    ["Menghadirkan Ruang Aman", "Menyediakan telinga tulus tanpa prasangka buruk bagi mahasiswa dan anak muda demi melepaskan stres psikologis harian."],
    ["Menghubungkan Kompetensi Tepat", "Secara jujur menyaring dan menggolongkan hambatan emosional klien agar mendapat level pendamping yang sesuai krisisnya."],
    ["Edukasi Preventif Berkelanjutan", "Aktif mengimbangi kesadaran masyarakat awam di jalur digital mengenai batasan koping mental wellness dan batas kedaruratan psikiatri."],
    ["Menjaga Privasi Mutlak", "Mengutamakan perlindungan rekam catatan keluhan dan identitas personal sebagai prioritas integritas etis tertinggi kami."]
  ];
  const values = [
    ["Komitmen Utama", "Pendekatan Layanan Humanis", "Kami memprioritaskan rasa nyaman dan keterbukaan dalam setiap sesi pendampingan, menciptakan ruang dengar tanpa batas kaku yang murni mendengarkan setiap keluhan secara tulus."],
    ["Nilai yang Kami Jaga", "Komitmen Menjaga Privasi", "Setiap kisah, identitas, maupun catatan batin pengguna terlindungi dengan prinsip keamanan informasi tingkat tinggi, memastikan pengguna dapat mencurahkan isi hatinya seaman mungkin."],
    ["Sistem Rujukan", "Arah Rujukan Tepat & Aman", "Kami berkomitmen menyaring keluhan secara objektif untuk menghubungkan setiap krisis emosional dengan pendamping atau mitra berlisensi klinis yang memiliki kompetensi sesuai."]
  ];

  return (
    <>
      <section className="container about-story">
        <div className="about-story-copy">
          <span className="tag">The Philosophy: Heart by Heart</span>
          <h2>Sebab Setiap Cerita Berharga Untuk Didengar Tanpa Prasangka</h2>
          <p>QONSULIN.ID didirikan karena keresahan mendalam mengenai betapa sulitnya anak muda di era digital saat ini mendapatkan kawan dengar yang aman. Tekanan akademik perkuliahan, bayang-bayang kegagalan skripsi, perbandingan standar hidup yang semu di media sosial, hingga gesekan relasi asmara kerap kali bertumpuk di dalam pikiran.</p>
          <p>Kami mengamati bahwa banyak orang awam atau mahasiswa memendam tekanan stresnya hingga membengkak menjadi krisis depresi akut, sekadar karena akses konseling formal psikologi yang terstigma "kaku" dan biaya terapinya mahal.</p>
          <p><strong>Melalui pendekatan Heart by Heart,</strong> kami membalik cara lama itu. Kami memosisikan QONSULIN.ID sebagai penolong pertama batin, menyediakan rekan pendengar bersahabat dan sistem rujukan bertahap.</p>
        </div>
        <aside className="about-identity-card">
          <h3>Identitas QONSULIN.ID</h3>
          <dl>
            <div><dt>Bentuk Layanan</dt><dd>Platform Pendampingan Mental Wellness</dd></div>
            <div><dt>Motto Gerakan</dt><dd>Heart by Heart</dd></div>
            <div><dt>Pusat Administratif</dt><dd>Bukittinggi, Sumatera Barat</dd></div>
            <div><dt>Target Utama</dt><dd>Mahasiswa, Freshgraduates & Young Adults</dd></div>
          </dl>
          <p><CheckCircle2 size={16} /><span><strong>Aktivitas Awal Kami:</strong> Telah menyiarkan puluhan edukasi kesehatan mental murni lewat konten Instagram, menyelenggarakan webinar edukatif, serta menampung curhat awal berbasis komunitas.</span></p>
        </aside>
      </section>

      <section className="section about-founder">
        <div className="container about-founder-card">
          <div className="about-founder-photo"><img src="/sari-dewi-founder.jpg" alt="Sari Dewi, CEO & Founder QONSULIN.ID" /></div>
          <div className="about-founder-copy">
            <span className="tag">CEO & Founder</span>
            <h2>Sari Dewi</h2>
            <p>Memimpin QONSULIN.ID sebagai ruang pendampingan mental wellness yang humanis, hangat, dan mudah diakses.</p>
          </div>
        </div>
      </section>

      <section className="about-dark-band">
        <div className="container about-dark-layout">
          <article className="about-vision-card">
            <span className="icon-tile"><HeartHandshake size={24} /></span>
            <h3>Visi Agung Kami</h3>
            <p>"Menjadi platform konsultasi online dan pendampingan mental wellness terkemuka nasional yang aman, humanis, bertahap, dan mudah diakses oleh siapa pun demi menciptakan masa depan generasi muda yang stabil secara emosional."</p>
          </article>
          <div>
            <div className="section-head center about-dark-head"><span className="tag">Commitment Grid</span><h2>Garansi Arah Visi & Misi Kami</h2></div>
            <div className="about-mission-label">Misi Konkret Operasional:</div>
            <div className="about-mission-grid">
              {missions.map(([title, body], index) => <article className="about-mission-card" key={title}><span>{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}
            </div>
          </div>
        </div>
      </section>

      <section className="section about-values">
        <div className="container">
          <div className="section-head center"><span className="tag">Nilai Utama Kami</span><h2>Komitmen Bersama untuk Kesehatan Mental</h2><p>QONSULIN.ID terus dikembangkan untuk menghadirkan layanan yang aman, mudah diakses, dan lebih terarah bagi pengguna dengan berpedoman pada tiga pilar utama berikut.</p></div>
          <div className="about-value-grid">
            {values.map(([eyebrow, title, body], index) => <article className="about-value-card" key={title}><span>{String(index + 1).padStart(2, "0")}</span><small>{eyebrow}</small><h3>{title}</h3><p>{body}</p></article>)}
          </div>
          <article className="service-legal-alert about-alert"><AlertTriangle size={20} /><div><strong>Perhatian Terkait Batasan Medis Legal</strong><p>QONSULIN.ID berupaya menjadi nilai awal penapis keresahan emosional ringan dan sedang. Kami tidak menggantikan evaluasi, penanganan, atau keputusan dari psikolog, psikiater, dokter, maupun fasilitas kesehatan.</p></div></article>
          <article className="services-orange-cta about-cta"><h2>Ingin Terlibat Mendukung Generasi Sehat Mental?</h2><p>Apabila kamu adalah institusi universitas, lembaga bimbingan mahasiswa, penggerak komunitas kesiswaan, atau konselor bersertifikasi yang rindu berkolaborasi dengan QONSULIN.ID, mari kita bersua.</p><a className="btn btn-white" href={whatsappUrl}><MessageCircle size={16} />Hubungi Kerjasama QONSULIN.ID</a></article>
        </div>
      </section>
    </>
  );
}

function Field({ label, placeholder, textarea = false, wide = false }: { label: string; placeholder: string; textarea?: boolean; wide?: boolean }) {
  return <label className={`field ${wide ? "wide" : ""}`}><span>{label}</span>{textarea ? <textarea placeholder={placeholder} /> : <input placeholder={placeholder} />}</label>;
}
