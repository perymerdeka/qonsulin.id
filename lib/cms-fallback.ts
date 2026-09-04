import { activities as seedActivities, people as seedPeople, posts as seedPosts } from "@/lib/data";

export type CmsStatus = "draft" | "published" | "archived";

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  category: string;
  tags: string[];
  status: CmsStatus;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityItem = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  source_url: string | null;
  image_url: string | null;
  date: string | null;
  status: CmsStatus;
  created_at: string;
  updated_at: string;
};

export type Testimonial = {
  id: string;
  quote: string;
  persona: string;
  context: string | null;
  status: CmsStatus;
  created_at: string;
  updated_at: string;
};

export type LeadMagnet = {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  cta_label: string;
  status: CmsStatus;
  created_at: string;
  updated_at: string;
};

export type GalleryEvent = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  cover_image_url: string | null;
  source_url: string | null;
  event_date: string | null;
  status: CmsStatus;
  created_at: string;
  updated_at: string;
  media_count?: number;
};

export type GalleryMedia = {
  id: string;
  gallery_event_id: string;
  media_type: "image" | "video";
  media_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

export type StreamingVideo = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  source_label: string | null;
  stream_type: "offline" | "live" | "upcoming";
  published_at: string | null;
  live_at: string | null;
  sort_order: number;
  is_featured: boolean;
  status: CmsStatus;
  created_at: string;
  updated_at: string;
};

export type CompanionProfile = {
  id: string;
  name: string;
  role: string;
  badge: string;
  credential: string;
  image_url: string | null;
  description: string | null;
  preview: string | null;
  focus_tags: string[];
  education: string[];
  focus: string[];
  experience: string[];
  languages: string | null;
  cta_enabled: boolean;
  sort_order: number;
  status: CmsStatus;
  created_at: string;
  updated_at: string;
};

export type AnyRow = BlogPost | ActivityItem | Testimonial | LeadMagnet | GalleryEvent | StreamingVideo | CompanionProfile;

export type Store = {
  posts: BlogPost[];
  activities: ActivityItem[];
  testimonials: Testimonial[];
  "lead-magnets": LeadMagnet[];
  galleries: GalleryEvent[];
  streaming: StreamingVideo[];
  companions: CompanionProfile[];
};

const now = "2026-05-25T11:00:00.000Z";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function plainExcerpt(value?: string | null, length = 160) {
  const text = (value || "")
    .replace(/[#>*_`~\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > length ? `${text.slice(0, length - 1)}...` : text;
}

export const fallbackPosts: BlogPost[] = seedPosts.map((post, index) => ({
  id: `seed-post-${index + 1}`,
  title: post.title,
  slug: post.slug,
  excerpt: post.excerpt,
  content: `## ${post.title}\n\n${post.excerpt}\n\nKonten ini adalah data cadangan lokal sampai tabel Supabase \`blog_posts\` berisi konten produksi.`,
  cover_image_url: null,
  category: post.category,
  tags: post.category.split(",").map((tag) => tag.trim()).filter(Boolean),
  status: post.status,
  seo_title: `${post.title} - Qonsulin.id`,
  seo_description: post.excerpt,
  published_at: post.status === "published" ? now : null,
  created_at: now,
  updated_at: now
}));

export const fallbackActivities: ActivityItem[] = [
  ...seedActivities.map((activity, index) => ({
    id: `seed-activity-${index + 1}`,
    title: activity.title,
    description: "Social proof aktivitas komunitas QONSULIN.ID untuk edukasi dan kampanye digital kesehatan mental yang aman.",
    type: activity.type,
    source_url: "https://www.instagram.com/p/DY2I7d9PdXO/?igsh=MXZuYjFob2h4d3JzMw==",
    image_url: activity.image,
    date: activity.date,
    status: activity.status,
    created_at: now,
    updated_at: now
  })),
  {
    id: "seed-activity-2",
    title: "Sharing Session Komunitas: Saling Mendengar Tanpa Menghakimi",
    description: "Program tatap muka terbatas berkonsep lingkaran cerita sebaya untuk mahasiswa sekitar Bukittinggi.",
    type: "community",
    source_url: "https://qonsulin.id",
    image_url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=600",
    date: "30 April 2026",
    status: "published",
    created_at: now,
    updated_at: now
  }
];

export const fallbackTestimonials: Testimonial[] = [
  { id: "seed-testimonial-1", quote: "Waktu stuck di metodologi penelitian dan takut sekali menghadap dosen, saya selalu overthinking sendirian. Di QONSULIN.ID saya mendapat pendampingan yang ramah dan didengar tulus.", persona: "Mahasiswa tingkat akhir, 22 tahun", context: "Stres skripsi & kecemasan akademik", status: "published", created_at: now, updated_at: now },
  { id: "seed-testimonial-2", quote: "Konseling harian terarah di sini membantu saya mengurai tumpukan keputusasaan akibat ditolak kerja berkali-kali setelah wisuda.", persona: "Fresh graduate, 23 tahun", context: "Quarter-life crisis", status: "published", created_at: now, updated_at: now },
  { id: "seed-testimonial-3", quote: "Konseling malam via obrolan WhatsApp nyaman, fleksibel, terjangkau, dan sangat menjaga nama baik serta privasi pribadi saya.", persona: "Karyawan Swasta, 25 tahun", context: "Burnout lingkungan kerja baru", status: "published", created_at: now, updated_at: now }
];

export const fallbackLeadMagnets: LeadMagnet[] = [
  { id: "seed-lead-1", title: "Panduan 10 Menit Menenangkan Pikiran Saat Overthinking", description: "Metode grounding praktis 5-4-3-2-1 yang gampang dilakukan secara mandiri.", file_url: "https://drive.google.com/open?id=example_overthinking_pdf_qonsulin", cta_label: "Download Panduan Gratis", status: "published", created_at: now, updated_at: now },
  { id: "seed-lead-2", title: "Checklist: Kapan Aku Harus Konseling ke Profesional?", description: "Evaluasi mandiri ringkas untuk mengukur beban kecemasan dan menentukan kapan saatnya bercerita.", file_url: "https://drive.google.com/open?id=example_checklist_pdf_qonsulin", cta_label: "Isi Checklist Gratis", status: "published", created_at: now, updated_at: now }
];

export const fallbackGalleryEvents: GalleryEvent[] = fallbackActivities.map((activity) => ({
  id: `gallery-${activity.id}`,
  title: activity.title,
  slug: slugify(activity.title),
  description: activity.description,
  cover_image_url: activity.image_url,
  source_url: activity.source_url,
  event_date: null,
  status: activity.status,
  created_at: activity.created_at,
  updated_at: activity.updated_at,
  media_count: 0
}));

export const fallbackGalleryMedia: GalleryMedia[] = [];
export const fallbackStreamingVideos: StreamingVideo[] = [];

export const fallbackCompanions: CompanionProfile[] = [
  ...seedPeople.map((person, index) => ({
    id: `seed-companion-${index + 1}`,
    name: person.name,
    role: person.role,
    badge: person.badge,
    credential: person.credential,
    image_url: person.image,
    description: person.copy,
    preview: person.preview,
    focus_tags: person.focusTags,
    education: person.education || [],
    focus: person.focus || [],
    experience: person.experience || [],
    languages: person.languages || null,
    cta_enabled: true,
    sort_order: index + 1,
    status: "published" as CmsStatus,
    created_at: now,
    updated_at: now
  })),
  {
    id: "seed-companion-annisa-zakaria",
    name: "Annisa Zakaria Putri, S.Psi.",
    role: "Konselor Mental Wellness / Konselor Psikologi, Teman Cerita / Teman Curhat",
    badge: "Konselor Mental Wellness",
    credential: "Sarjana Psikologi (S.Psi.), Universitas Islam Negeri Syarif Hidayatullah Jakarta",
    image_url: null,
    description: "Hai, saya Annisa, seorang konselor dan teman curhatmu yang siap mendengarkan setiap ceritamu serta membantumu menghadapi masa-masa perjuangan dengan penuh empati dan kasih sayang tanpa penghakiman. Saya berkomitmen untuk menyediakan ruang aman dan nyaman agar kamu bisa berbagi cerita secara terbuka demi meringankan beban pikiranmu. Mari cerita!",
    preview: "Konselor dan teman curhat yang siap mendengarkan ceritamu dengan empati, kasih sayang, dan tanpa penghakiman.",
    focus_tags: ["Teman cerita", "Validasi perasaan", "Pulih & berdamai", "Pengembangan diri"],
    education: ["Sarjana Psikologi (S.Psi.), Universitas Islam Negeri Syarif Hidayatullah Jakarta"],
    focus: ["Mendengarkan cerita atau curahan hati tanpa penghakiman", "Memberikan saran yang lebih sehat dan membangun", "Memvalidasi perasaan dan hal-hal yang telah dicapai/dilalui klien", "Menjadi jembatan untuk klien kembali berdamai dan pulih", "Menjadi fasilitator untuk hal-hal yang sedang atau akan dicapai klien"],
    experience: ["Strategi Mengelola Kecerdasan Sosial Emosional melalui 7 Jurus Bimbingan dan Konseling Hebat - Atma Karta", "Kelas Akademi Keluarga #12 Mengasuh Tanpa Luka - Keluarga Risman dan Masjid Nurul Ashri", "School of Love: What is Love, Actually - School of Love", "Mental Health Bootcamp: Knowing Your Unfinished Business - Hope Community", "Workshop: Teknik & Etika Konseling Era Digital - Sekolah Tinggi Informatika & Komputer Indonesia", "One Day Workshop: Compassion - Asosiasi Psikologi Transpersonal Indonesia"],
    languages: "Indonesia, Inggris",
    cta_enabled: true,
    sort_order: seedPeople.length + 1,
    status: "published",
    created_at: now,
    updated_at: now
  },
  {
    id: "seed-companion-annisa-rahma",
    name: "Ns. Annisa Rahma, S.Kep.",
    role: "Ners Pendamping Anak, Lansia & Home Care",
    badge: "Ners Pendamping",
    credential: "Ns., Universitas Mercubaktijaya Padang",
    image_url: null,
    description: "Lulusan Profesi Ners dengan pengalaman praktik di bidang keperawatan anak, lansia, maternitas, komunitas, jiwa, medikal bedah, dan gawat darurat. Memiliki kemampuan komunikasi yang baik, ramah, sabar, serta siap memberikan pendampingan dan layanan keperawatan dasar yang aman, profesional, dan berfokus pada kenyamanan serta kesejahteraan klien.",
    preview: "Lulusan Profesi Ners dengan pengalaman praktik keperawatan di berbagai bidang. Siap memberikan pendampingan dan layanan keperawatan dasar yang aman, profesional, dan berfokus pada kenyamanan klien.",
    focus_tags: ["Ners pendamping", "Layanan home care", "Keperawatan anak & lansia", "Dukungan emosional"],
    education: ["Ns. (Profesi Ners), Universitas Mercubaktijaya Padang, 2026", "S.Kep. (Sarjana Keperawatan), Universitas Mercubaktijaya Padang, 2025"],
    focus: [
      "Pendampingan anak saat orang tua bekerja atau berhalangan",
      "Temani bermain, belajar, dan aktivitas harian anak",
      "Pendampingan lansia di rumah maupun aktivitas luar rumah",
      "Temani kontrol kesehatan dan kunjungan rumah sakit",
      "Pendampingan pasien masa pemulihan",
      "Teman curhat dan dukungan emosional",
      "Monitoring kondisi kesehatan dasar dan tanda-tanda vital",
      "Perawatan luka sederhana",
      "Edukasi kesehatan bagi pasien dan keluarga",
      "Pendampingan tindakan medis sesuai kompetensi dan kewenangan profesi keperawatan"
    ],
    experience: [
      "Praktik Keperawatan Anak, Kebidanan, dan Gawat Darurat di RSUP Dr. M. Djamil Padang",
      "Praktik Keperawatan Dasar dan Medikal Bedah di RSUD M. Yamin Pariaman",
      "Praktik Keperawatan Jiwa dan Komunitas di RSJ Prof. HB Saanin Padang dan Puskesmas Nanggalo",
      "Praktik Keperawatan Gerontik di Panti Sosial Tresna Werdha Sabai Nan Aluih Sicincin",
      "Praktik Keperawatan Anak dan Kebidanan di Puskesmas Air Dingin, Padang",
      "Praktik Keperawatan Gerontik di Puskesmas Kuranji, Padang",
      "Praktik Manajemen Keperawatan di RSI Ibnu Sina Padang",
      "Basic Trauma Cardiac Life Support (BTCLS) – PPNI, 2026",
      "TOEFL Score 440 – Pusat Bahasa Padang, 2025",
      "Berpengalaman mendampingi dan merawat lansia dalam aktivitas sehari-hari, termasuk membantu pemenuhan kebutuhan dasar, pemantauan kondisi kesehatan, serta memberikan dukungan emosional.",
      "Memiliki pengalaman merawat lansia dengan kolostomi, termasuk membantu perawatan dan pemantauan kondisi sesuai kebutuhan pasien.",
      "Berpengalaman mengasuh dan mendampingi bayi baru lahir (newborn) hingga usia 1 tahun, meliputi perawatan harian, pemantauan kondisi umum, serta mendukung tumbuh kembang anak sesuai usianya.",
      "Berpengalaman mendampingi anak dalam aktivitas bermain, belajar, dan kebutuhan sehari-hari dengan pendekatan yang sabar, ramah, dan penuh perhatian."
    ],
    languages: "Bahasa Indonesia, Bahasa Minang, Bahasa Inggris (Dasar)",
    cta_enabled: true,
    sort_order: seedPeople.length + 2,
    status: "published",
    created_at: now,
    updated_at: now
  }
];

export const fallbackStore: Store = {
  posts: fallbackPosts,
  activities: fallbackActivities,
  testimonials: fallbackTestimonials,
  "lead-magnets": fallbackLeadMagnets,
  galleries: fallbackGalleryEvents,
  streaming: fallbackStreamingVideos,
  companions: fallbackCompanions
};
