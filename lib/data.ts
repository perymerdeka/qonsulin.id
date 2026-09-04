import type { LucideIcon } from "lucide-react";
import { BookOpen, Brain, BriefcaseBusiness, CheckCircle2, Coffee, GraduationCap, HeartHandshake, MapPin, MessageCircle, ShieldCheck, Sparkles, Stethoscope, UsersRound } from "lucide-react";

export type Status = "published" | "draft";

export type Post = {
  title: string;
  category: string;
  slug: string;
  status: Status;
  excerpt: string;
};

export type Activity = {
  title: string;
  type: string;
  date: string;
  status: Status;
  image: string;
};

export type Service = {
  id: string;
  title: string;
  format: string;
  description: string;
  suitableFor: string[];
  media: string;
  icon: LucideIcon;
};

export type CompanionService = {
  title: string;
  description: string;
  suitableFor: string;
  icon: LucideIcon;
};

export type PersonProfile = {
  name: string;
  role: string;
  badge: string;
  credential: string;
  image: string;
  copy: string;
  preview: string;
  focusTags: string[];
  education?: string[];
  focus?: string[];
  experience?: string[];
  languages?: string;
};

export const whatsappUrl = "https://wa.me/6285191020288?text=Halo%20Admin%20QONSULIN.ID%2C%20saya%20ingin%20tahu%20lebih%20banyak%20dan%20berdiskusi%20terkait%20koping%20kesehatan%20mental%20harian%20saya.%20Bagaimana%20langkah%20mulainya%3F";

export const problems = [
  ["Takut Dihakimi & Menanggung Stigma", "Anak muda sering takut bercerita karena khawatir dicap lemah, berlebihan, atau dijauhi moralnya oleh orang sekitar."],
  ["Bingung Memilah Derajat Masalah", "Tidak tahu apakah masalah batinnya butuh bantuan profesional berwenang, ruang cerita ringan, atau saran bimbingan konselor."],
  ["Ketersediaan Teman Dengar Empatik", "Sulit mencari telinga yang sungguh-sungguh mendengar tanpa sibuk memotong pembicaraan dengan petuah kaku."],
  ["Tekanan Akademik & Quarter-life Crisis", "Beban skripsi mengendap bertahun-tahun, burnout masa studi, kecemasan masa depan, hingga runtuhnya kestabilan emosi."]
] as const;

export const people: PersonProfile[] = [
  {
    name: "Nur Anisa Fitri Rahmani, S. Psi",
    role: "Mental Wellness Partner",
    badge: "Peer Counselor",
    credential: "S. Psi, Universitas Islam Negeri Imam Bonjol",
    image: "/nuranisa.webp",
    copy: "Pendamping awal untuk ruang cerita, asesmen kebutuhan, serta dukungan batin mahasiswa dan profesional muda.",
    preview: "Lulusan Psikologi yang siap menjadi teman cerita dan pendengar yang aman untuk kamu yang sedang melewati masa dinamis dari remaja hingga dewasa awal.",
    focusTags: ["Stres akademik", "Quarter-life crisis", "Masalah relasi/pertemanan", "Self-growth"],
    focus: ["Ruang cerita aman untuk remaja dan dewasa awal", "Stres akademik dan tekanan tugas akhir", "Quarter-life crisis", "Masalah relasi dan pertemanan", "Pemetaan kebutuhan awal sebelum rujukan lanjutan"],
    languages: "Bahasa Indonesia"
  },
  {
    name: "Yasmin Nabila Erawadi, S.Psi",
    role: "Konselor Pendamping",
    badge: "Konselor Mental Wellness",
    credential: "S.Psi, Binus University",
    image: "/yasmin.webp",
    copy: "Membantu memetakan emosi, tekanan akademik, dan kebutuhan rujukan secara bertahap serta manusiawi.",
    preview: "Hai, aku Yasmin. Aku siap menjadi ruang aman dan pendengar untuk segala keluh kesahmu. You don't have to go through this alone, mari berproses bersama.",
    focusTags: ["Stress & Anxiety Management", "Self-Growth", "Interpersonal Relationship Dynamics"],
    focus: ["Stress & anxiety management", "Self-growth", "Interpersonal relationship dynamics", "Pendampingan refleksi emosi", "Komunikasi suportif untuk kebutuhan harian"],
    languages: "Bahasa Indonesia dan Bahasa Inggris"
  },
  {
    name: "dr. Dito Anurogo, M.Sc., Ph.D.",
    role: "Dokter, Peneliti Kesehatan & Edukator Kesehatan",
    badge: "Edukator Kesehatan",
    credential: "Dokter, M.Sc. Biomedis, Kandidat Ph.D.",
    image: "/dito-anurogo.webp",
    copy: "Dokter, peneliti, penulis, dan dosen yang aktif dalam bidang kesehatan, biomedis, literasi kesehatan, serta pengembangan ilmu pengetahuan. Berkomitmen membantu masyarakat memahami kesehatan secara lebih mudah, ilmiah, dan aplikatif.",
    preview: "Dokter, peneliti, penulis, dan dosen yang aktif membantu masyarakat memahami kesehatan secara mudah, ilmiah, dan aplikatif.",
    focusTags: ["Evidence-based health", "Literasi kesehatan", "Riset & kepenulisan", "Produktivitas"],
    education: ["Dokter (Profesi Kedokteran), Universitas Islam Sultan Agung", "M.Sc. Biomedis, Universitas Gadjah Mada", "Kandidat Ph.D., Taipei Medical University"],
    focus: ["Edukasi kesehatan berbasis bukti", "Gaya hidup sehat dan pencegahan penyakit", "Literasi kesehatan masyarakat", "Pengembangan diri dan produktivitas", "Pendampingan akademik, riset, dan kepenulisan ilmiah"],
    experience: ["Dosen Fakultas Kedokteran dan Ilmu Kesehatan Universitas Muhammadiyah Makassar", "Penulis puluhan buku dan ratusan artikel ilmiah/populer", "Delegasi dan peserta berbagai pelatihan internasional bidang kesehatan", "Memiliki sertifikasi kegawatdaruratan dan pelatihan medis berkelanjutan"],
    languages: "Bahasa Indonesia dan Bahasa Inggris"
  }
];

export const companionServices: CompanionService[] = [
  { title: "Temani Ngobrol", description: "Ruang percakapan ringan untuk melepas beban, merapikan pikiran, atau sekadar ditemani saat sedang tidak ingin sendirian.", suitableFor: "Saat overthinking, sepi, atau butuh teman dengar aman.", icon: MessageCircle },
  { title: "Temani Jalan-jalan", description: "Pendampingan aktivitas luar ruang yang santai, manusiawi, dan tetap memperhatikan batas aman serta kenyamanan pengguna.", suitableFor: "Saat butuh udara segar, rutinitas ringan, atau companion bepergian.", icon: MapPin },
  { title: "Temani Belajar", description: "Teman belajar terarah untuk menjaga ritme, menemani pengerjaan tugas, membaca, atau memecah rasa stuck akademik.", suitableFor: "Mahasiswa, pelajar, dan profesional yang butuh accountability partner.", icon: BookOpen },
  { title: "Temani ke Rumah Sakit", description: "Pendampingan non-medis untuk menemani proses administrasi, menunggu giliran, atau membantu pengguna merasa lebih tenang.", suitableFor: "Saat kontrol kesehatan, pemeriksaan rutin, atau butuh ditemani keluarga/teman pengganti.", icon: Stethoscope },
  { title: "Temani Aktivitas Harian", description: "Pendampingan untuk agenda sederhana seperti makan, belanja kebutuhan, menghadiri acara, atau menyelesaikan urusan personal.", suitableFor: "Saat butuh support praktis dan kehadiran yang tidak menghakimi.", icon: Coffee },
  { title: "Temani Refleksi Diri", description: "Sesi companion untuk menyusun prioritas, memetakan perasaan, dan menentukan langkah kecil berikutnya secara lebih jernih.", suitableFor: "Saat bingung mengambil keputusan atau sedang menata hidup kembali.", icon: HeartHandshake }
];

export const services: Service[] = [
  { id: "ruang-cerita", title: "Ruang Cerita Online", format: "Format Layanan: Online Full", description: "Untuk kamu yang sedang merasa lelah, bingung, tertekan, atau butuh teman dengar aktif yang tulus menerima cerita apa adanya tanpa menghakimi.", suitableFor: ["Mengalami stres harian ringan", "Butuh melepas penat dan overthinking", "Tidak memiliki tempat bercerita yang aman", "Belum tahu apakah perlu bantuan profesional medis"], media: "Sesi percakapan online terarah dengan Active Listener terlatih", icon: MessageCircle },
  { id: "konseling-online", title: "Konseling Online", format: "Format Layanan: Online Full", description: "Pendampingan mental wellness terpandu bersama konselor partner untuk mendalami akar masalah psikologis yang mengganggu produktivitas harianmu.", suitableFor: ["Mengalami kecemasan berlebih atau overthinking kronis", "Kesulitan meregulasi emosi negatif", "Memiliki hambatan interpersonal harian", "Butuh arahan pemetaan solusi emosional"], media: "Sesi konsultasi privat online 1-on-1 via panggilan terpandu", icon: Sparkles },
  { id: "konsultasi-akademik", title: "Konsultasi Akademik & Tekanan Skripsi", format: "Format Layanan: Online Full", description: "Layanan pendampingan khusus mahasiswa S1, S2, maupun S3 yang diliputi rasa cemas, hambatan motivasi, burnout pengerjaan tugas akhir, hingga kebingungan arah masa depan pasca kuliah.", suitableFor: ["Stuck pengerjaan tugas akhir, skripsi, tesis, atau disertasi", "Mengalami sindrom imposter", "Burnout akademis akibat tekanan jadwal kuliah", "Kecemasan karier pasca lulus kuliah"], media: "Pendampingan akademis-emosional 1-on-1", icon: GraduationCap },
  { id: "relationship-support", title: "Relationship & Family Support", format: "Format Layanan: Online Full", description: "Membantu kamu memetakan pola komunikasi berpasangan, mengurai simpul konflik hubungan romantis, serta mendampingi pemulihan luka batin interpersonal.", suitableFor: ["Hubungan penuh konflik komunikasi", "Luka batin pasca putus cinta", "Tekanan salah paham dalam keluarga", "Panik menghadapi babak hidup baru"], media: "Konseling hubungan privat berbasis online", icon: HeartHandshake },
  { id: "career-self-growth", title: "Career & Self Growth Support", format: "Format Layanan: Online Full", description: "Ruang refleksi untuk menata ulang arah karier, percaya diri, batas sehat, dan keputusan personal yang terasa berat.", suitableFor: ["Bimbang menentukan arah karier", "Sulit menjaga batas kerja", "Butuh teman refleksi keputusan", "Ingin mengembangkan self-growth"], media: "Percakapan terarah berbasis refleksi tujuan", icon: BriefcaseBusiness },
  { id: "offline-referral", title: "Offline Referral & Companion Concept", format: "Format Layanan: Rujukan Terarah", description: "Jika kebutuhanmu membutuhkan dukungan profesional berwenang, admin membantu menata langkah rujukan secara aman dan bertahap.", suitableFor: ["Perlu evaluasi lebih lanjut", "Muncul risiko keselamatan", "Butuh pendampingan lanjutan", "Membutuhkan profesional berizin"], media: "Pemetaan kebutuhan dan arahan rujukan sesuai kondisi", icon: ShieldCheck }
];

export const posts: Post[] = [
  { title: "Bulimia Nervosa", category: "Kesehatan mental", slug: "bulimia-nervosa", status: "draft", excerpt: "Catatan edukatif tentang pola makan, emosi, dan kebutuhan bantuan yang tepat." },
  { title: "Detik Ojol selamatkan dara cantik yang ingin bunuh diri", category: "Kesehatan mental, darurat", slug: "detik-ojol-selamatkan-dara-cantik-yang-ingin-bunuh-diri", status: "published", excerpt: "Refleksi tentang respons sekitar saat seseorang berada di ambang krisis." },
  { title: "Cara ampuh untuk meregulasi emosi", category: "Kesehatan mental, mahasiswa", slug: "cara-ampuh-untuk-meregulasi-emosi", status: "published", excerpt: "Latihan sederhana untuk mengenali, memberi nama, dan menata emosi harian." },
  { title: "Cara mengetahui Love Language Kita", category: "Kesehatan mental, mahasiswa, love language", slug: "cara-mengetahui-love-language-kita", status: "draft", excerpt: "Panduan mengenali kebutuhan afeksi tanpa menuntut pasangan menjadi pembaca pikiran." },
  { title: "Ketika Dilanda Jatuh Cinta", category: "Kesehatan mental", slug: "ketika-dilanda-jatuh-cinta", status: "published", excerpt: "Tentang euforia, batas sehat, dan menjaga diri saat perasaan sedang penuh." },
  { title: "Stress Karena Patah Hati, Ini Solusinya!", category: "Kesehatan Mental", slug: "stress-karena-patah-hati-ini-solusinya", status: "published", excerpt: "Langkah bertahap untuk melewati putus hubungan tanpa menyalahkan diri terus-menerus." },
  { title: "Lagu lagu playlist penyemangat hidup", category: "Kesehatan mental", slug: "lagu-lagu-playlist-penyemangat-hidup", status: "published", excerpt: "Rekomendasi aktivitas kecil untuk menemani hari berat." },
  { title: "Susah Move On dari Tempat Tidur? Yuk Kenalan dengan Clinomania", category: "Kesehatan Mental", slug: "susah-move-on-dari-tempat-tidur-yuk-kenalan-dengan-clinomania", status: "published", excerpt: "Membedakan lelah biasa, kebiasaan menunda, dan sinyal tubuh yang perlu diperhatikan." },
  { title: "PARANOIA DAN GANGGUAN DELUSI", category: "kesehatan mental", slug: "paranoia-dan-gangguan-delusi", status: "published", excerpt: "Edukasi non-diagnostik tentang kapan perlu mencari bantuan profesional berwenang." },
  { title: "Ketika Ilmu Berkembang, Iman Menuntun: Refleksi atas Psikologi Islam dan Konvensional", category: "Artikel Psikologi", slug: "ketika-ilmu-berkembang-iman-menuntun-refleksi-atas-psikologi-islam-dan-konvensional", status: "published", excerpt: "Jembatan reflektif antara ilmu psikologi dan nilai spiritual dalam merawat batin." }
];

export const activities: Activity[] = [
  { title: "Webinar Quarter life crisis di era AI", type: "event", date: "30 Mei 2026", status: "published", image: "/webinar.jpg" }
];

export const faq = [
  ["Apa itu QONSULIN.ID?", "QONSULIN.ID adalah ruang pendampingan mental wellness yang membantu pengguna memetakan kebutuhan awal, bercerita secara aman, dan mendapatkan arahan layanan yang sesuai."],
  ["Apakah QONSULIN.ID sama dengan layanan psikolog klinis?", "Tidak. QONSULIN.ID berfokus pada pendampingan batin, konseling terarah, dan rujukan bila pengguna membutuhkan bantuan profesional berwenang."],
  ["Apakah semua pendamping di QONSULIN.ID adalah psikolog?", "Tim pendamping dibagi berdasarkan kompetensi, mulai dari active listener terlatih, konselor partner, hingga rujukan profesional bila diperlukan."],
  ["Apakah konsultasi ini dilakukan secara online?", "Ya, layanan utama berjalan online agar mudah dijangkau, dengan konsep rujukan offline bila situasi membutuhkan dukungan lebih lanjut."],
  ["Apakah ada layanan konsultasi khusus mahasiswa yang pusing skripsi?", "Ada. QONSULIN.ID menyediakan pendampingan akademik dan tekanan skripsi untuk membantu mengurai kecemasan, burnout, serta kebingungan arah."]
];

export const audiences = ["Mahasiswa akhir yang sedang menyelesaikan skripsi", "Profesional muda dengan burnout dan tekanan kerja", "Pasangan atau keluarga yang butuh komunikasi lebih sehat", "Siapa pun yang butuh tempat cerita aman sebelum mengambil langkah lanjutan"];

export const why = [
  ["Komitmen Menjaga Privasi Obrolan", "Cerita pengguna diperlakukan sebagai ruang aman, bukan konsumsi publik."],
  ["Pendekatan Manusiawi (Heart by Heart)", "Bahasa yang digunakan hangat, empatik, dan tidak menghakimi."],
  ["Sistem Screening Bertingkat", "Kebutuhan pengguna dipilah agar arahan pendampingan tidak berlebihan atau keliru."],
  ["Biaya Sangat Bersahabat & Ringan", "Dirancang agar mahasiswa dan anak muda bisa mulai mencari dukungan tanpa takut biaya tinggi."]
];

export const supportTiers = [
  ["Tier 1: Teman Dengar Terlatih", "Pendamping Sebaya / Active Listener", "Rekan empatik pendengar aktif yang telah menempuh pelatihan dasar psikologi, komunikasi suportif, dan pertolongan pertama psikologis."],
  ["Tier 2: Konselor Solutif Pascasarjana & Praktisi", "Konselor Mental Wellness Partner", "Praktisi pendampingan yang berpengalaman menangani problematika spesifik hidup dan membantu penyusunan pemecahan masalah."],
  ["Tier 3: Rujukan Lanjutan Jika Diperlukan", "Rujukan Profesional Berwenang", "Mitra profesional berwenang yang dapat menjadi opsi rujukan ketika kebutuhan pengguna memerlukan pendampingan lanjutan."]
];

export { BookOpen, Brain, CheckCircle2, MessageCircle, UsersRound };
