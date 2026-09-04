-- =========================================================
-- QONSULIN.ID SUPABASE ONE-FILE SETUP
-- Copy semua isi file ini ke Supabase SQL Editor, lalu Run.
-- Aman dijalankan ulang: create table memakai IF NOT EXISTS,
-- policy/trigger di-drop dulu, seed memakai ON CONFLICT.
-- =========================================================

create extension if not exists pgcrypto;

do $$ begin
  create type public.content_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.stream_type as enum ('offline', 'live', 'upcoming');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.gallery_media_type as enum ('image', 'video');
exception when duplicate_object then null;
end $$;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text,
  cover_image_url text,
  category text not null default 'Kesehatan mental',
  tags text[] not null default '{}',
  status public.content_status not null default 'draft',
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null default 'event',
  source_url text,
  image_url text,
  date text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  persona text not null,
  context text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_magnets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_url text,
  cta_label text not null default 'Download Panduan Gratis',
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  description text,
  cover_image_url text,
  source_url text,
  event_date date,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_media (
  id uuid primary key default gen_random_uuid(),
  gallery_event_id uuid not null references public.gallery_events(id) on delete cascade,
  media_type public.gallery_media_type not null default 'image',
  media_url text not null,
  thumbnail_url text,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.streaming_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  description text,
  video_url text not null,
  thumbnail_url text,
  source_label text,
  stream_type public.stream_type not null default 'offline',
  published_at date,
  live_at timestamptz,
  sort_order integer not null default 0,
  is_featured boolean not null default false,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  badge text not null default 'Pendamping',
  credential text not null default '',
  image_url text,
  description text,
  preview text,
  focus_tags text[] not null default '{}',
  education text[] not null default '{}',
  focus text[] not null default '{}',
  experience text[] not null default '{}',
  languages text,
  cta_enabled boolean not null default true,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists companions_name_unique on public.companions (name);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_blog_posts_updated_at on public.blog_posts;
create trigger touch_blog_posts_updated_at before update on public.blog_posts for each row execute function public.touch_updated_at();
drop trigger if exists touch_activities_updated_at on public.activities;
create trigger touch_activities_updated_at before update on public.activities for each row execute function public.touch_updated_at();
drop trigger if exists touch_testimonials_updated_at on public.testimonials;
create trigger touch_testimonials_updated_at before update on public.testimonials for each row execute function public.touch_updated_at();
drop trigger if exists touch_lead_magnets_updated_at on public.lead_magnets;
create trigger touch_lead_magnets_updated_at before update on public.lead_magnets for each row execute function public.touch_updated_at();
drop trigger if exists touch_gallery_events_updated_at on public.gallery_events;
create trigger touch_gallery_events_updated_at before update on public.gallery_events for each row execute function public.touch_updated_at();
drop trigger if exists touch_streaming_videos_updated_at on public.streaming_videos;
create trigger touch_streaming_videos_updated_at before update on public.streaming_videos for each row execute function public.touch_updated_at();
drop trigger if exists touch_companions_updated_at on public.companions;
create trigger touch_companions_updated_at before update on public.companions for each row execute function public.touch_updated_at();

alter table public.admin_users enable row level security;
alter table public.blog_posts enable row level security;
alter table public.activities enable row level security;
alter table public.testimonials enable row level security;
alter table public.lead_magnets enable row level security;
alter table public.gallery_events enable row level security;
alter table public.gallery_media enable row level security;
alter table public.streaming_videos enable row level security;
alter table public.companions enable row level security;

drop policy if exists "Public can read published blog posts" on public.blog_posts;
create policy "Public can read published blog posts" on public.blog_posts for select using (status = 'published');
drop policy if exists "Public can read published activities" on public.activities;
create policy "Public can read published activities" on public.activities for select using (status = 'published');
drop policy if exists "Public can read published testimonials" on public.testimonials;
create policy "Public can read published testimonials" on public.testimonials for select using (status = 'published');
drop policy if exists "Public can read published lead magnets" on public.lead_magnets;
create policy "Public can read published lead magnets" on public.lead_magnets for select using (status = 'published');
drop policy if exists "Public can read published gallery events" on public.gallery_events;
create policy "Public can read published gallery events" on public.gallery_events for select using (status = 'published');
drop policy if exists "Public can read media for published galleries" on public.gallery_media;
create policy "Public can read media for published galleries" on public.gallery_media for select using (
  exists (select 1 from public.gallery_events e where e.id = gallery_event_id and e.status = 'published')
);
drop policy if exists "Public can read published streaming videos" on public.streaming_videos;
create policy "Public can read published streaming videos" on public.streaming_videos for select using (status = 'published');
drop policy if exists "Public can read published companions" on public.companions;
create policy "Public can read published companions" on public.companions for select using (status = 'published');

drop policy if exists "Admins can read admin users" on public.admin_users;
create policy "Admins can read admin users" on public.admin_users for select using (auth.role() = 'authenticated');
drop policy if exists "Admins manage blog posts" on public.blog_posts;
create policy "Admins manage blog posts" on public.blog_posts for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "Admins manage activities" on public.activities;
create policy "Admins manage activities" on public.activities for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "Admins manage testimonials" on public.testimonials;
create policy "Admins manage testimonials" on public.testimonials for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "Admins manage lead magnets" on public.lead_magnets;
create policy "Admins manage lead magnets" on public.lead_magnets for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "Admins manage gallery events" on public.gallery_events;
create policy "Admins manage gallery events" on public.gallery_events for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "Admins manage gallery media" on public.gallery_media;
create policy "Admins manage gallery media" on public.gallery_media for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "Admins manage streaming videos" on public.streaming_videos;
create policy "Admins manage streaming videos" on public.streaming_videos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "Admins manage companions" on public.companions;
create policy "Admins manage companions" on public.companions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into public.admin_users (email, role, is_active)
values ('halo@qonsulin.id', 'administrator', true)
on conflict (email) do update set role = excluded.role, is_active = excluded.is_active;

insert into public.blog_posts (title, slug, excerpt, content, cover_image_url, category, tags, status, seo_title, seo_description, published_at)
values
  ('Cara ampuh untuk meregulasi emosi', 'cara-ampuh-untuk-meregulasi-emosi', 'Latihan sederhana untuk mengenali, memberi nama, dan menata emosi harian.', '## Regulasi emosi\n\nMulai dari memberi nama pada emosi yang hadir.', null, 'Kesehatan mental, mahasiswa', array['emosi','mahasiswa'], 'published', 'Cara Ampuh Meregulasi Emosi - Qonsulin', 'Panduan ringkas regulasi emosi harian.', now()),
  ('Ketika Dilanda Jatuh Cinta', 'ketika-dilanda-jatuh-cinta', 'Tentang euforia, batas sehat, dan menjaga diri saat perasaan sedang penuh.', '## Jatuh cinta dan batas sehat\n\nRasa yang besar tetap perlu ruang aman.', null, 'Kesehatan mental', array['relasi'], 'published', 'Ketika Dilanda Jatuh Cinta - Qonsulin', 'Refleksi sehat saat jatuh cinta.', now())
on conflict (slug) do nothing;

insert into public.activities (title, description, type, source_url, image_url, date, status)
values ('Webinar Quarter life crisis di era AI', 'Social proof aktivitas komunitas QONSULIN.ID untuk edukasi dan kampanye digital kesehatan mental yang aman.', 'event', 'https://www.instagram.com/p/DY2I7d9PdXO/?igsh=MXZuYjFob2h4d3JzMw==', '/webinar.jpg', '30 Mei 2026', 'published')
on conflict do nothing;

insert into public.companions (name, role, badge, credential, image_url, description, preview, focus_tags, education, focus, experience, languages, cta_enabled, sort_order, status)
values
  ('Nur Anisa Fitri Rahmani, S. Psi', 'Mental Wellness Partner', 'Peer Counselor', 'S. Psi, Universitas Islam Negeri Imam Bonjol', '/nuranisa.webp', 'Pendamping awal untuk ruang cerita, asesmen kebutuhan, serta dukungan batin mahasiswa dan profesional muda.', 'Lulusan Psikologi yang siap menjadi teman cerita dan pendengar yang aman untuk kamu yang sedang melewati masa dinamis dari remaja hingga dewasa awal.', array['Stres akademik','Quarter-life crisis','Masalah relasi/pertemanan','Self-growth'], array[]::text[], array['Ruang cerita aman untuk remaja dan dewasa awal','Stres akademik dan tekanan tugas akhir','Quarter-life crisis','Masalah relasi dan pertemanan','Pemetaan kebutuhan awal sebelum rujukan lanjutan'], array[]::text[], 'Bahasa Indonesia', true, 1, 'published'),
  ('Yasmin Nabila Erawadi, S.Psi', 'Konselor Pendamping', 'Konselor Mental Wellness', 'S.Psi, Binus University', '/yasmin.webp', 'Membantu memetakan emosi, tekanan akademik, dan kebutuhan rujukan secara bertahap serta manusiawi.', 'Hai, aku Yasmin. Aku siap menjadi ruang aman dan pendengar untuk segala keluh kesahmu. You don''t have to go through this alone, mari berproses bersama.', array['Stress & Anxiety Management','Self-Growth','Interpersonal Relationship Dynamics'], array[]::text[], array['Stress & anxiety management','Self-growth','Interpersonal relationship dynamics','Pendampingan refleksi emosi','Komunikasi suportif untuk kebutuhan harian'], array[]::text[], 'Bahasa Indonesia dan Bahasa Inggris', true, 2, 'published'),
  ('dr. Dito Anurogo, M.Sc., Ph.D.', 'Dokter, Peneliti Kesehatan & Edukator Kesehatan', 'Edukator Kesehatan', 'Dokter, M.Sc. Biomedis, Kandidat Ph.D.', '/dito-anurogo.webp', 'Dokter, peneliti, penulis, dan dosen yang aktif dalam bidang kesehatan, biomedis, literasi kesehatan, serta pengembangan ilmu pengetahuan. Berkomitmen membantu masyarakat memahami kesehatan secara lebih mudah, ilmiah, dan aplikatif.', 'Dokter, peneliti, penulis, dan dosen yang aktif membantu masyarakat memahami kesehatan secara mudah, ilmiah, dan aplikatif.', array['Evidence-based health','Literasi kesehatan','Riset & kepenulisan','Produktivitas'], array['Dokter (Profesi Kedokteran), Universitas Islam Sultan Agung','M.Sc. Biomedis, Universitas Gadjah Mada','Kandidat Ph.D., Taipei Medical University'], array['Edukasi kesehatan berbasis bukti','Gaya hidup sehat dan pencegahan penyakit','Literasi kesehatan masyarakat','Pengembangan diri dan produktivitas','Pendampingan akademik, riset, dan kepenulisan ilmiah'], array['Dosen Fakultas Kedokteran dan Ilmu Kesehatan Universitas Muhammadiyah Makassar','Penulis puluhan buku dan ratusan artikel ilmiah/populer','Delegasi dan peserta berbagai pelatihan internasional bidang kesehatan','Memiliki sertifikasi kegawatdaruratan dan pelatihan medis berkelanjutan'], 'Bahasa Indonesia dan Bahasa Inggris', true, 3, 'published'),
  ('Annisa Zakaria Putri, S.Psi.', 'Konselor Mental Wellness / Konselor Psikologi, Teman Cerita / Teman Curhat', 'Konselor Mental Wellness', 'Sarjana Psikologi (S.Psi.), Universitas Islam Negeri Syarif Hidayatullah Jakarta', null, 'Hai, saya Annisa, seorang konselor dan teman curhatmu yang siap mendengarkan setiap ceritamu serta membantumu menghadapi masa-masa perjuangan dengan penuh empati dan kasih sayang tanpa penghakiman. Saya berkomitmen untuk menyediakan ruang aman dan nyaman agar kamu bisa berbagi cerita secara terbuka demi meringankan beban pikiranmu. Mari cerita!', 'Konselor dan teman curhat yang siap mendengarkan ceritamu dengan empati, kasih sayang, dan tanpa penghakiman.', array['Teman cerita','Validasi perasaan','Pulih & berdamai','Pengembangan diri'], array['Sarjana Psikologi (S.Psi.), Universitas Islam Negeri Syarif Hidayatullah Jakarta'], array['Mendengarkan cerita atau curahan hati tanpa penghakiman','Memberikan saran yang lebih sehat dan membangun','Memvalidasi perasaan dan hal-hal yang telah dicapai/dilalui klien','Menjadi jembatan untuk klien kembali berdamai dan pulih','Menjadi fasilitator untuk hal-hal yang sedang atau akan dicapai klien'], array['Strategi Mengelola Kecerdasan Sosial Emosional melalui 7 Jurus Bimbingan dan Konseling Hebat - Atma Karta','Kelas Akademi Keluarga #12 Mengasuh Tanpa Luka - Keluarga Risman dan Masjid Nurul Ashri','School of Love: What is Love, Actually - School of Love','Mental Health Bootcamp: Knowing Your Unfinished Business - Hope Community','Workshop: Teknik & Etika Konseling Era Digital - Sekolah Tinggi Informatika & Komputer Indonesia','One Day Workshop: Compassion - Asosiasi Psikologi Transpersonal Indonesia'], 'Indonesia, Inggris', true, 4, 'published')
on conflict (name) do update set
  role = excluded.role,
  badge = excluded.badge,
  credential = excluded.credential,
  image_url = excluded.image_url,
  description = excluded.description,
  preview = excluded.preview,
  focus_tags = excluded.focus_tags,
  education = excluded.education,
  focus = excluded.focus,
  experience = excluded.experience,
  languages = excluded.languages,
  cta_enabled = excluded.cta_enabled,
  sort_order = excluded.sort_order,
  status = excluded.status,
  updated_at = now();

-- =========================================================
-- LIVE SEED DATA FROM QONSULIN.ID
-- =========================================================

-- Generated from https://ptytrlcaodtntsfzalhk.supabase.co
-- Run supabase/schema.sql first, then this seed.

insert into public.blog_posts (id, title, slug, excerpt, content, cover_image_url, category, tags, status, seo_title, seo_description, published_at, created_at, updated_at)
values
  ('b773a325-a507-4e9b-ba48-774295f701b4', 'Bulimia Nervosa', 'bulimia-nervosa', 'Bulimia Nervosa ', 'Bulimia Nervosa

Bulimia nervosa atau bulimia merupakan keadaan dimana seseorang tidak makan sama sekali atau makan dalam jumlah yang banyak lalu mengeluarkan nya dengan paksa, dengan cara memuntahkan nya atau meminum obat pencahar. Bulimia termasuk dalam gangguan jiwa, serta gangguan pola makan, biasanya lebih banyak dialami oleh wanita antara usia 16-40 tahun. Hal ini biasanya dilakukan untuk menghilangkan kalori yang telah dimakan untuk menjaga berat badan yang terkait dengan rasa rendah diri, depresi, atau bahkan kecenderungan untuk menyakiti diri sendiri.

Gejala yang terjadi pada penderita bulimia diantaranya adalah sering beranggapan negatif teradap bentuk tubuhnya (selalu merasa terlalu gemuk), menghindari atau makan dalam jumlah yang sangat sedikit jenisjenis makan tertentu, namun suatu ketika penderita memakan makanan yang dihindari tersebut dengan berlebih, akhirnya ia merasa bersalah dan memaksakan keluar makanan yang telah dimakan dengan jalan paksa. Seseorang dapat dikatakan menderita bulimia apabila mengalami gejala ini dua kali dalam seminggu selama minimal 3 bulan.

Gejala bulimia harus segera diatasi, karena akan menimbulkan dampak yang berbahaya bagi penderitanya, komplikasi yang terjadi diantaranya adalah kerusakan gigi, pembengkakan kelenjar air liur, dehidrasi, rambut kering, kuku rapuh, gagal ginjal, serta gagal jantung. Penyebab bulimia sendiri belum diketahui secara pasti, namun, ada beberapa faktor yang dapat menyebabkan seseorang mengalami bulimia yaitu jenis kelamin, masalah psikologis, usia, faktor keturunan, tuntutan sosial, dan tuntutan pekerjaan. Kriteria utama yang mengindikasikan bulimia adalah keadaan makan yang berlebih disertai usaha untuk mengeluarkan kalori yang telah dimakan dengan jalan paksa, serta asumsi negatif tentang bentuk tubuh dan berat badan. Penanganan utama bulimia adalah dengan penanganan psikologis, yaitu terapi perilaku kognitif (CBT) dimana pasien akan dibantu mengenali penyebab bulimia, dan terapi perilaku interpersonal dimana pasien akan dibantu untuk meningkatkan komunikasi dengan orang lain. Dalam menangani bulimia, tak jarang dokter juga mengkombinasikan dengan penggunaan penghambat pelepasan selektif serotonin atau SSRI, namun penggunaan obat ini tidak cocok digunakan pada penderita dibawah 18 tahun. Langkah dalam penanganan bulimia umumnya membutuhkan waktu dan tenaga yang tidak sedikit. Semakin lama penderita mengalami maka akan semakin lama proses penanganan nya.

Pencegahan bulimia dapat dilakukan dengan melakukan pendekatan, tidak memberikan komentar-komentar yang berhubungan dengan fisik dan mempengaruhi psikologis. Atau dengan cara menjadi contoh yang baik bagi orang-orang di sekitar dan menjaga pola makan dan hidup yang sehat.

Sumber:

https://www.alodokter.com/bulimia', 'https://drive.google.com/file/d/1B9dhgtpxXXnOtuatSBf6KWkJKBY0RP4X/view?usp=drivesdk', 'Kesehatan mental ', array['mahasiswa', 'bulimia']::text[], 'published', 'Bulimia', 'Bulimia Nervosa ', '2026-06-20T10:49:17.793+00:00', '2026-06-05T04:21:58.01+00:00', '2026-06-20T10:49:17.793+00:00'),
  ('956c5a4f-4eea-4bcc-a8a7-8c7fbf764432', 'Detik Ojol selamatkan dara cantik yang ingin bunuh diri', 'detik-ojol-selamatkan-dara-cantik-yang-ingin-bunuh-diri', 'Seorang perempuan berhasil diselamatkan oleh driver ojol, warga, dan aparat saat diduga mengalami krisis emosional. Peristiwa ini menjadi pengingat pentingnya kepedulian, respons cepat, dan dukungan bagi orang yang berada dalam kondisi berbahaya.', '# Detik-Detik Driver Ojol dan Warga Selamatkan Perempuan yang Diduga Hendak Mengakhiri Hidup

Seorang perempuan bernama Khalisa Putri Handayani (24), warga asal Merak, Banten, berhasil diselamatkan setelah diduga hendak mengakhiri hidup di area Jembatan Penyeberangan Orang (JPO) Jalan Mayjend Soetoyo, Tegal Barat, Kota Tegal, pada Rabu, 19 Desember 2018 sekitar pukul 15.00 WIB.

Dari informasi yang dihimpun di lapangan, perempuan tersebut diduga sedang mengalami tekanan berat hingga nekat melakukan tindakan yang membahayakan dirinya.

Beruntung, sejumlah warga, driver ojek online, dan aparat kepolisian yang berada di sekitar Pos Maya dekat Perempatan Pasific Mall segera bertindak cepat untuk menyelamatkan korban.

## Aksi Penyelamatan Berlangsung Dramatis

Evakuasi korban berlangsung cukup dramatis dan sempat menarik perhatian warga yang berada di sekitar jalur Pantura dekat perempatan tersebut.

Salah satu warga sekitar bernama Slamet menuturkan bahwa kejadian itu sempat membuat warga panik. Menurutnya, ada driver ojek online yang dengan sigap memegang korban agar tidak terjatuh, kemudian aparat kepolisian ikut membantu proses penyelamatan.

Dalam rekaman video warga yang sempat tersebar di media sosial, terlihat korban menolak ketika hendak diselamatkan oleh beberapa orang di lokasi. Ia tampak meronta ketika upaya penyelamatan dilakukan.

Seorang polisi juga terlihat berlari ke atas jembatan penyeberangan untuk membantu menggagalkan tindakan tersebut. Sementara itu, warga yang berada di bawah JPO tampak cemas menyaksikan proses penyelamatan.

Setelah berhasil diselamatkan, korban kemudian diamankan oleh personel Pos Polisi Maya dan dibawa ke Polsek Tegal Barat untuk penanganan lebih lanjut.

## Pentingnya Respons Cepat Saat Melihat Tanda Bahaya

Peristiwa ini menjadi pengingat bahwa kondisi krisis emosional bisa terjadi pada siapa saja. Dalam situasi seperti ini, respons cepat dari orang sekitar dapat menjadi faktor penting untuk menyelamatkan nyawa seseorang.

Ketika melihat seseorang yang tampak ingin menyakiti diri sendiri, langkah yang perlu dilakukan adalah tetap tenang, tidak menghakimi, segera meminta bantuan orang sekitar, dan menghubungi pihak berwenang atau layanan darurat.

Dukungan emosional juga sangat penting. Seseorang yang sedang berada dalam kondisi krisis tidak selalu membutuhkan nasihat panjang, tetapi membutuhkan kehadiran, rasa aman, dan bantuan untuk terhubung dengan pihak yang mampu menangani situasi tersebut.

## Jika Kamu Sedang Mengalami Krisis

Jika kamu sedang merasa tidak sanggup menghadapi tekanan hidup, memiliki keinginan untuk menyakiti diri sendiri, atau merasa ingin mengakhiri hidup, segera cari bantuan.

Kamu bisa menghubungi orang terdekat yang kamu percaya, mendatangi fasilitas kesehatan terdekat, atau menghubungi layanan darurat setempat.

Kamu tidak harus menghadapi semuanya sendirian. Meminta bantuan bukan tanda lemah, tetapi langkah penting untuk menjaga keselamatan diri.

## Penutup

Aksi cepat driver ojol, warga, dan aparat kepolisian dalam peristiwa ini menunjukkan bahwa kepedulian orang sekitar dapat menjadi pertolongan yang sangat berarti.

Di balik setiap tindakan krisis, sering kali ada beban emosional yang tidak terlihat. Karena itu, penting bagi kita untuk lebih peka, tidak mudah menghakimi, dan berani membantu ketika melihat seseorang berada dalam kondisi berbahaya.

---

## Sumber

Artikel ini diadaptasi dari pemberitaan Tribunnews.com dengan judul:  
*Khalisa Nyaris Loncat dari JPO Perempatan Pasific Mall Tegal*.













', 'https://res.cloudinary.com/drzkofoof/image/upload/v1780633837/ojol_mpb0es.jpg', 'Kesehatan mental, darurat ', array['percobaan bunuh diri', 'krisis emosional', 'kesehatan mental', 'pencegahan bunuh diri', 'driver ojol', 'kepedulian sosial', 'bantuan darurat', 'dukungan emosional', 'mental wellness', 'qonsulin.id']::text[], 'published', 'Driver Ojol dan Warga Selamatkan Perempuan dari Percobaan Bunuh Diri', 'Kisah driver ojol, warga, dan aparat yang menyelamatkan perempuan dari dugaan percobaan bunuh diri menjadi pengingat pentingnya respons cepat saat krisis.', '2026-06-05T04:30:54.175+00:00', '2026-06-05T04:15:59.885+00:00', '2026-06-05T04:30:54.175+00:00'),
  ('1c346f8d-5bb6-4923-9936-82752d2aacc6', 'Cara ampuh untuk meregulasi emosi', 'cara-ampuh-untuk-meregulasi-emosi', 'Regulasi emosi membantu kita mengenali, memahami, dan menata perasaan tanpa harus menyangkalnya. Artikel ini membahas cara sederhana untuk meregulasi emosi agar pikiran lebih tenang dan respons terhadap keadaan menjadi lebih bijak.', '# Cara Ampuh untuk Meregulasi Emosi

Emosi adalah bagian dari diri kita. Setiap hari, kita dihadapkan pada situasi di mana emosi berperan penting dalam kehidupan.

Ketika berada dalam situasi yang tidak menyenangkan, kita cenderung merasa gelisah. Saat menghadapi situasi yang mengesalkan, kita bisa merasa marah. Namun, terkadang luapan emosi negatif ini sulit dikontrol sehingga dapat memicu berbagai masalah.

## Faktor yang Mempengaruhi Emosi

Ada banyak faktor yang dapat mempengaruhi emosi kita. Tidak hanya berasal dari situasi atau kondisi yang sedang dihadapi, tetapi juga dari berbagai pengalaman dan keadaan lain.

Beberapa faktor yang dapat mempengaruhi emosi antara lain:

- Perlakuan orang tua
- Lingkungan sekitar
- Stres
- Kelelahan fisik
- Kelelahan mental
- Trauma masa lalu

Untuk kasus-kasus gangguan kesehatan mental yang serius, diperlukan bantuan secara berkala dari tenaga ahli atau profesional agar proses regulasi emosi dapat dilakukan dengan lebih tepat.

## Mengapa Emosi Perlu Dikenali?

Dalam kehidupan sehari-hari, kita tidak bisa lepas dari beragam emosi yang datang silih berganti.

Pada dasarnya, emosi berfungsi untuk membantu kita mengenali rasa dari dalam hati dan memahami batasan-batasan diri yang tidak selalu tampak oleh mata.

Disadari atau tidak, hati kita adalah kompas untuk mengenal arah kehidupan serta menjadi tanda dari keadaan diri kita yang sebenarnya.

## Apa Itu Regulasi Emosi?

Regulasi emosi bukan hanya tentang mengendalikan emosi agar tidak berlarut-larut, baik dalam emosi positif maupun negatif.

Lebih dari itu, regulasi emosi membantu kita mengenali luapan perasaan dari dalam hati dengan lebih baik.

Meregulasi atau menata emosi tidak sama dengan berpura-pura baik-baik saja. Regulasi emosi bukan berarti mengatakan:

> “Kita perlu berpura-pura bahagia dalam situasi yang tidak menyenangkan.”

Penyangkalan atau *denial* tidak membantu memperbaiki kontrol emosi. Hal penting yang perlu diperhatikan pertama kali ketika meregulasi emosi adalah mengenali emosi yang sedang muncul.

## Cara Mengenali dan Meregulasi Emosi

Ada beberapa langkah sederhana yang bisa dilakukan untuk mulai mengenali dan menata emosi.

### 1. Lakukan Teknik Equal Breathing

Langkah pertama adalah melakukan teknik **equal breathing**.

Caranya:

1. Pejamkan mata.
2. Perhatikan cara bernapas selama beberapa kali.
3. Tarik napas perlahan melalui hidung sambil menghitung 1-2-3-4.
4. Buang napas dengan hitungan yang sama, yaitu 1-2-3-4.
5. Saat menarik dan membuang napas, perhatikan emosi apa saja yang sedang dirasakan.

Teknik ini dapat membantu tubuh dan pikiran menjadi lebih tenang, sehingga kita lebih mudah mengenali emosi yang sedang muncul.

### 2. Identifikasi Emosi yang Dirasakan

Setelah merasa cukup tenang, cobalah mengidentifikasi emosi yang sedang dirasakan.

Tanyakan pada diri sendiri:

- Apa yang sebenarnya sedang aku rasakan?
- Apakah aku sedang marah, sedih, kecewa, takut, atau lelah?
- Apa yang membuat perasaan ini muncul?
- Apa yang sebenarnya sedang aku butuhkan saat ini?

Dengan mengenali emosi setelah pikiran dan hati terasa lebih tenang, kita dapat merespons keadaan sekitar dengan lebih bijak.

Regulasi emosi membantu kita tidak hanya bereaksi secara spontan, tetapi juga memilih respons yang lebih sehat dan sesuai dengan keadaan.

## Kutipan Reflektif

Dalam bukunya yang berjudul *Berlari di Tengah Hujan*, Indra Sugiarto pernah mengatakan:

> “Teduhkan hatimu sejenak  
> Tenangkan pikiranmu sejenak  
> Dengarkan dulu apa yang kamu rasakan  
> Apa yang kamu rasakan itu nyata  
> Apa yang kamu rasakan itu terjadi dalam dirimu.”

## Penutup

Meregulasi emosi bukan berarti menolak atau menekan perasaan yang sedang hadir. Sebaliknya, regulasi emosi mengajak kita untuk lebih jujur mengenali apa yang sedang terjadi di dalam diri.

Dengan mengenali emosi, menenangkan pikiran, dan memahami kebutuhan diri, kita dapat belajar merespons kehidupan dengan lebih tenang dan bijaksana.

Selamat mencoba tips-tips dari kami.

---










', 'https://res.cloudinary.com/drzkofoof/image/upload/v1780633567/regulasi_emosi_ows6f4.jpg', 'Kesehatan mental, mahasiswa ', array['regulasi emosi', 'cara mengontrol emosi', 'kesehatan mental', 'emosi negatif', 'equal breathing', 'manajemen emosi', 'self awareness', 'ketenangan diri', 'psikologi', 'mental wellness', 'qonsulin.id']::text[], 'published', 'Cara Ampuh Meregulasi Emosi agar Pikiran Lebih Tenang', 'Pelajari cara meregulasi emosi dengan teknik sederhana seperti equal breathing, mengenali perasaan, dan memahami kebutuhan diri agar lebih tenang.', '2026-06-05T04:26:24.694+00:00', '2026-06-05T03:57:15.627+00:00', '2026-06-05T04:26:24.694+00:00'),
  ('92b7d086-a4b1-4381-b3ba-cb80de19f8e1', 'Ketika Dilanda Jatuh Cinta', 'ketika-dilanda-jatuh-cinta', 'Jatuh cinta tidak hanya soal perasaan. Ada proses kimiawi dalam tubuh yang ikut memengaruhi rasa deg-degan, bahagia, rindu, hingga sulit berhenti memikirkan seseorang. Artikel ini membahas hormon yang sering dikaitkan dengan cinta dan cara menjaga perasaan tetap sehat.', '# Saat Jatuh Cinta, Apa yang Terjadi dalam Tubuh Kita?

Pernah dengar lirik lagu Fatin Sidqia yang berbunyi, “Dia... dia... telah mencuri hatiku”?

Kadang, pembahasan tentang cinta memang terdengar menarik di telinga dan terasa indah di hati. Saat jatuh cinta, seseorang bisa merasa deg-degan, berbunga-bunga, susah berhenti memikirkan orang yang disukai, bahkan merasa rindu ketika ia jauh dari pandangan.

Namun, tahukah kamu bahwa perasaan jatuh cinta juga memiliki sisi ilmiah?

Secara tidak sadar, ketika seseorang jatuh cinta, ada berbagai proses kimiawi dalam tubuh dan otak yang ikut berperan. Perasaan berdebar, bahagia, semangat, hingga sulit fokus tidak muncul begitu saja. Ada kerja hormon dan neurotransmitter yang turut memengaruhi suasana hati, energi, dan cara kita merespons seseorang yang kita sukai.

Yuk, kenalan dengan beberapa zat kimia tubuh yang sering dikaitkan dengan perasaan jatuh cinta.

## 1. Phenylethylamine (PEA): “Sepertinya Aku Jatuh Cinta”

**Phenylethylamine** atau PEA adalah zat kimia yang diproduksi oleh tubuh dan sering dikaitkan dengan perasaan senang, bersemangat, dan euforia.

Saat seseorang sedang tertarik pada orang lain, tubuh bisa terasa lebih berenergi. Kita bisa merasa berdebar, bahagia, antusias, bahkan kehilangan nafsu makan karena pikiran terlalu sibuk memikirkan orang tersebut.

Perasaan seperti “melayang” atau “berbunga-bunga” saat melihat si dia bisa berkaitan dengan aktivitas zat kimia ini bersama zat lain di dalam otak.

## 2. Dopamin: “Kenapa Bayangan Dia Selalu Muncul?”

**Dopamin** sering dikaitkan dengan rasa senang, motivasi, dan sistem penghargaan dalam otak.

Ketika seseorang jatuh cinta, dopamin dapat membuat pengalaman bersama orang yang disukai terasa menyenangkan dan ingin diulang kembali. Itulah mengapa seseorang bisa merasa lebih bersemangat, bahagia, dan terus ingin mencari kabar dari orang yang ia sukai.

Dalam batas yang wajar, perasaan ini bisa terasa menyenangkan. Namun, jika tidak dikendalikan, seseorang bisa menjadi terlalu bergantung pada perhatian atau respons dari orang lain.

## 3. Endorfin: “Dunia Terasa Lebih Indah”

**Endorfin** dikenal sebagai zat kimia tubuh yang dapat membantu meredakan rasa nyeri dan memberi rasa nyaman.

Dalam hubungan yang sehat, kedekatan emosional dengan orang yang disayangi dapat membuat seseorang merasa lebih tenang, aman, dan bahagia. Karena itu, ketika sedang jatuh cinta, dunia kadang terasa lebih indah dari biasanya.

Namun, penting untuk tetap sadar bahwa rasa nyaman bukan alasan untuk mengabaikan batasan diri, nilai hidup, atau hubungan sosial yang sehat.

## 4. Serotonin: “Kenapa Aku Terus Memikirkan Dia?”

**Serotonin** berperan dalam suasana hati, pola pikir, dan keseimbangan emosi.

Dalam fase awal jatuh cinta, sebagian orang bisa mengalami pikiran yang berulang tentang orang yang disukai. Wajahnya terbayang-bayang, pesan darinya ditunggu, dan hal-hal kecil tentang dirinya terasa penting.

Perasaan ini wajar terjadi dalam batas tertentu. Namun, jika pikiran tentang seseorang mulai membuat kita sulit tidur, sulit belajar, sulit bekerja, atau kehilangan kendali atas diri sendiri, itu bisa menjadi tanda bahwa kita perlu berhenti sejenak dan menata emosi.

## 5. Feromon: “Kenapa Dia Terasa Menarik?”

**Feromon** sering dibahas sebagai sinyal kimia yang dapat berperan dalam ketertarikan. Pada hewan, peran feromon lebih jelas terlihat. Pada manusia, pembahasan tentang feromon masih lebih kompleks dan tidak sesederhana “seseorang menjadi tertarik hanya karena feromon”.

Meski begitu, ketertarikan seseorang memang bisa dipengaruhi oleh banyak hal, seperti aroma tubuh, bahasa tubuh, ekspresi wajah, cara berbicara, kedekatan emosional, hingga pengalaman pribadi.

Jadi, rasa tertarik tidak hanya berasal dari penampilan, tetapi juga dari cara seseorang hadir dan memberi kesan dalam hidup kita.

## 6. Oksitosin: “Rasanya Nyaman Kalau Dekat Dia”

**Oksitosin** sering disebut sebagai salah satu zat kimia yang berkaitan dengan kedekatan, rasa percaya, dan ikatan emosional.

Saat seseorang merasa aman, diterima, dan dekat secara emosional, oksitosin dapat ikut berperan dalam membangun rasa nyaman. Karena itu, hubungan yang hangat dan penuh perhatian bisa membuat seseorang merasa lebih tenang.

Namun, rasa nyaman tetap perlu disertai kesadaran. Kedekatan yang sehat bukan berarti kehilangan batasan, mengabaikan prinsip, atau menggantungkan seluruh kebahagiaan pada satu orang.

## 7. Norepinephrine: “Kok Jantung Jadi Berdebar?”

**Norepinephrine** berkaitan dengan respons tubuh terhadap semangat, kewaspadaan, dan rasa tertantang.

Saat bertemu orang yang disukai, tubuh bisa bereaksi seperti sedang menghadapi momen penting. Jantung berdetak lebih cepat, tangan terasa dingin, tubuh jadi lebih waspada, bahkan tidur dan makan bisa sedikit terganggu.

Itulah mengapa fase awal jatuh cinta kadang terasa menyenangkan sekaligus melelahkan. Ada rasa bahagia, tetapi juga ada rasa cemas dan tidak tenang.

## 8. Vasopressin: “Tentang Ikatan dan Kesetiaan”

**Vasopressin** sering dikaitkan dengan ikatan sosial dan perilaku keterikatan dalam beberapa penelitian. Namun, pada manusia, hubungan cinta dan kesetiaan tidak hanya ditentukan oleh satu hormon saja.

Kesetiaan, komitmen, dan hubungan jangka panjang lebih banyak dipengaruhi oleh kedewasaan, nilai hidup, komunikasi, tanggung jawab, kepercayaan, dan keputusan sadar untuk menjaga hubungan.

Dengan kata lain, hormon bisa ikut berperan dalam rasa dekat, tetapi pilihan dan akhlak tetap memegang peran penting dalam hubungan.

## Jatuh Cinta Perlu Dikelola dengan Bijak

Beberapa zat kimia tubuh di atas menunjukkan bahwa jatuh cinta memang bukan sekadar perasaan biasa. Ada proses biologis, emosional, dan psikologis yang ikut bekerja di dalam diri kita.

Namun, bukan berarti kita boleh membiarkan semua perasaan berjalan tanpa arah.

Pada fase jatuh cinta, sebagian orang bisa kehilangan kejernihan berpikir. Ada yang sulit mendengarkan nasihat orang tua, sahabat, atau orang terdekat. Ada juga yang mulai mengabaikan batasan diri karena terlalu mengikuti perasaan.

Di sinilah pentingnya belajar mengelola diri.

Perasaan suka adalah hal yang manusiawi. Tetapi perasaan tetap perlu dipandu oleh nilai, adab, akal sehat, dan kesadaran spiritual.

## Cinta, Batasan, dan Nilai Diri

Dalam Islam, cinta bukan sesuatu yang dilarang. Rasa suka dan ketertarikan adalah bagian dari fitrah manusia. Namun, Islam mengajarkan agar perasaan itu dijaga, diarahkan, dan tidak membawa seseorang pada tindakan yang merugikan diri sendiri maupun orang lain.

Allah mengingatkan dalam Al-Qur’an:

> “Dan janganlah kamu mendekati zina; sesungguhnya zina itu adalah suatu perbuatan yang keji dan suatu jalan yang buruk.”  
> **QS. Al-Isra’: 32**

Ayat ini mengingatkan kita untuk menjaga diri sejak dari pintu-pintu awalnya. Bukan hanya menjaga tindakan, tetapi juga menjaga pandangan, pendengaran, cara berkomunikasi, dan adab dalam berinteraksi.

Karena sering kali, sesuatu yang besar bermula dari hal kecil yang dibiarkan berulang-ulang.

## Bagaimana Cara Menjaga Diri Saat Jatuh Cinta?

Ada beberapa hal sederhana yang bisa dilakukan agar perasaan cinta tetap sehat dan tidak membuat kita kehilangan arah.

### 1. Sadari Bahwa Perasaan Tidak Harus Selalu Diikuti

Tidak semua rasa suka harus langsung dikejar. Tidak semua rindu harus langsung dituruti. Tidak semua ketertarikan harus dibalas dengan tindakan.

Kadang, kedewasaan dimulai ketika kita bisa berkata kepada diri sendiri, “Aku merasakan ini, tapi aku tetap perlu menjaga batas.”

### 2. Jaga Pandangan dan Interaksi

Apa yang sering kita lihat, dengar, dan pikirkan akan memengaruhi hati. Karena itu, menjaga pandangan dan adab interaksi bukan hanya soal aturan, tetapi juga cara merawat ketenangan diri.

Hubungan yang sehat tidak dibangun dari dorongan sesaat, tetapi dari sikap saling menghormati dan menjaga.

### 3. Libatkan Akal Sehat

Saat jatuh cinta, seseorang bisa cenderung melihat orang yang disukai sebagai sosok yang sempurna. Padahal, setiap manusia tetap memiliki kekurangan.

Memberi ruang bagi akal sehat membantu kita melihat hubungan dengan lebih jernih. Apakah hubungan ini membawa kebaikan? Apakah membuat kita semakin dekat dengan nilai hidup yang baik? Apakah membuat kita lebih tenang atau justru semakin gelisah?

### 4. Siapkan Diri Sebelum Berkomitmen

Jika memang sudah waktunya, cinta bisa diarahkan pada komitmen yang lebih serius, seperti pernikahan.

Namun, komitmen tidak cukup hanya dengan perasaan. Perlu kesiapan mental, spiritual, emosional, tanggung jawab, komunikasi, dan juga kesiapan secara kehidupan.

Menikah bukan sekadar menyatukan rasa, tetapi juga menyatukan niat untuk beribadah dan bertumbuh bersama.

## Penutup

Jatuh cinta adalah pengalaman manusiawi yang bisa terasa indah, membingungkan, sekaligus menguji kedewasaan.

Ada proses biologis yang ikut bekerja di dalam tubuh, tetapi manusia tetap memiliki akal, hati, nilai, dan pilihan untuk mengarahkan perasaannya.

Maka, ketika cinta mulai hadir, jangan hanya bertanya, “Apakah dia juga suka padaku?” Tetapi tanyakan juga, “Apakah perasaan ini membawaku menjadi pribadi yang lebih baik?”

Sabar. Semua ada waktunya. Jika sudah tepat jalannya, cinta tidak hanya membuat hati berbunga-bunga, tetapi juga membawa ketenangan dan kebaikan.

---

**Penulis:** Sari Dewi', 'https://res.cloudinary.com/drzkofoof/image/upload/v1780894071/dilandajatuhcinta_ngn50o.jpg', 'Kesehatan mental', array['hormon jatuh cinta', 'psikologi cinta', 'jatuh cinta', 'dopamin', 'oksitosin', 'serotonin', 'norepinephrine', 'kesehatan mental', 'cinta dalam islam', 'menjaga hati', 'relasi sehat', 'mental wellness', 'qonsulin.id']::text[], 'published', 'Hormon Jatuh Cinta: Kenapa Kita Bisa Deg-degan dan Terobsesi?', 'Kenali hormon dan zat kimia tubuh yang berperan saat jatuh cinta, mulai dari dopamin, oksitosin, serotonin, hingga cara menjaga perasaan tetap sehat.', '2026-06-08T04:48:08.178+00:00', '2026-06-05T03:32:26.169+00:00', '2026-06-08T04:48:08.178+00:00'),
  ('9abc87cc-11a9-4455-b029-50fc6ec08459', 'Stress Karena Patah Hati, Ini Solusinya!', 'stress-karena-patah-hati-ini-solusinya', 'Patah hati dapat memicu stres, kesedihan, dan perasaan kehilangan yang mendalam. Artikel ini membahas cara memahami emosi setelah patah hati, belajar menerima kenyataan, dan mencari dukungan ketika perasaan terasa terlalu berat.', '# Stres Karena Patah Hati: Cara Berdamai dengan Kehilangan dan Penolakan

Diputuskan oleh pasangan, cinta yang bertepuk sebelah tangan, kehilangan orang tersayang, atau melihat seseorang yang pernah dekat memilih jalan hidupnya sendiri bisa menjadi pengalaman yang sangat menyakitkan.

Patah hati bukan sekadar soal hubungan romantis. Di dalamnya bisa ada rasa kehilangan, kecewa, marah, bingung, bahkan perasaan tidak cukup berharga. Karena itu, stres akibat patah hati adalah hal yang bisa dialami siapa saja.

Saat seseorang mengalami patah hati, tubuh dan pikiran dapat meresponsnya sebagai tekanan emosional. Kesedihan yang mendalam, sulit tidur, kehilangan nafsu makan, sulit fokus, atau keinginan untuk menarik diri dari lingkungan bisa muncul sebagai bagian dari proses tersebut.

Namun, cara setiap orang mengelola perasaan tentu berbeda. Ada yang perlahan bisa bangkit, ada juga yang membutuhkan waktu lebih lama dan dukungan dari orang lain.

## Mengapa Patah Hati Bisa Menimbulkan Stres?

Stres adalah respons alami tubuh ketika menghadapi situasi yang terasa berat, mengecewakan, atau menyakitkan.

Dalam kasus patah hati, stres dapat muncul karena seseorang kehilangan hubungan, harapan, kebiasaan, atau sosok yang selama ini memberi rasa nyaman. Ketika sesuatu yang sebelumnya terasa dekat tiba-tiba berubah atau pergi, pikiran dan hati membutuhkan waktu untuk menyesuaikan diri.

Perasaan negatif seperti sedih, marah, kecewa, takut, dan bingung adalah reaksi yang wajar. Yang perlu diperhatikan adalah ketika perasaan tersebut berlangsung terlalu lama, semakin berat, atau mulai mengganggu kehidupan sehari-hari.

## Penolakan yang Membuat Luka Terasa Lebih Berat

Salah satu hal yang membuat stres akibat patah hati bertahan lebih lama adalah penolakan terhadap kenyataan yang sedang terjadi.

Beberapa pertanyaan mungkin terus muncul dalam pikiran, seperti:

> “Kenapa hal ini bisa terjadi?”  
> “Apa kurangnya aku?”  
> “Kenapa dia meninggalkan aku?”  
> “Kenapa semuanya berubah secepat ini?”  
> “Rasanya tidak mungkin ini benar-benar terjadi.”

Pertanyaan-pertanyaan seperti itu sangat manusiawi. Saat hati belum siap menerima kehilangan, pikiran sering kali mencari jawaban agar rasa sakit terasa lebih masuk akal.

Namun, jika terus-menerus terjebak dalam pertanyaan yang sama, luka bisa terasa semakin berat. Pikiran akan terus memutar ulang kejadian yang menyakitkan, sementara hati semakin sulit menemukan ruang untuk tenang.

## Cara Menghadapi Stres Karena Patah Hati

Tidak ada cara instan untuk menghilangkan rasa sakit setelah patah hati. Namun, ada beberapa langkah sederhana yang bisa membantu proses pemulihan menjadi lebih sehat.

### 1. Terima Bahwa Kehilangan Memang Menyakitkan

Langkah pertama bukan memaksa diri untuk langsung kuat, tetapi mengakui bahwa kehilangan memang menyakitkan.

Tidak perlu berpura-pura baik-baik saja jika memang sedang terluka. Mengakui perasaan bukan berarti lemah. Justru dari kejujuran itu, kita bisa mulai memahami apa yang sebenarnya sedang terjadi di dalam diri.

Kamu boleh sedih. Kamu boleh kecewa. Kamu boleh merasa belum siap. Semua itu bagian dari proses menjadi manusia.

### 2. Belajar Melepaskan dengan Perlahan

Melepaskan bukan berarti melupakan semuanya dalam waktu singkat. Melepaskan berarti mulai menerima bahwa tidak semua hal bisa berjalan sesuai harapan.

Dalam hidup, ada orang yang hadir untuk menemani kita dalam waktu yang lama. Ada juga yang hadir hanya pada bagian tertentu dari perjalanan kita. Tidak semua pertemuan akan menetap, dan tidak semua kehilangan berarti hidup berhenti.

Kalimat sederhana seperti **people come and go** mungkin terdengar klise, tetapi dalam banyak fase hidup, kita memang belajar bahwa setiap orang punya jalan masing-masing.

Yang pergi tidak selalu berarti buruk. Kadang, kepergian seseorang membuka ruang untuk kita mengenal diri sendiri dengan lebih jujur.

### 3. Latih Penerimaan Diri

Ikhlas bukan berarti rasa sakit langsung hilang. Ikhlas adalah proses menerima kenyataan sedikit demi sedikit, sambil tetap memberi ruang bagi diri sendiri untuk sembuh.

Orang yang mampu menerima kenyataan bukan berarti tidak pernah hancur. Mereka hanya belajar untuk tidak terus-menerus melawan sesuatu yang sudah terjadi.

Ketika kita mulai menerima keadaan, tekanan di dalam diri biasanya ikut berkurang. Dari sana, kita bisa melihat hidup dengan lebih tenang dan mengambil langkah berikutnya dengan lebih sadar.

### 4. Jangan Hadapi Sendirian Jika Terasa Terlalu Berat

Patah hati memang bisa menjadi bagian dari proses hidup. Namun, jika kesedihan terasa sangat berat, berlangsung lama, membuat sulit menjalani aktivitas, atau muncul pikiran untuk menyakiti diri sendiri, segera cari bantuan.

Bicaralah dengan orang yang dipercaya, keluarga, sahabat, konselor, psikolog, atau tenaga profesional lainnya.

Meminta bantuan bukan tanda lemah. Justru itu adalah langkah penting untuk menjaga diri tetap aman.

## Patah Hati Bisa Menjadi Ruang untuk Bertumbuh

Ada sebuah kutipan sederhana tentang kehidupan:

> Makin sering kamu olahraga,  
> badan kamu akan makin kuat.  
>
> Begitu juga dengan hidup.  
> Makin banyak kejadian yang kamu alami,  
> pikiran dan hatimu akan belajar menjadi lebih kuat.

Patah hati memang tidak menyenangkan. Namun, dari pengalaman itu, seseorang bisa belajar tentang penerimaan, batas diri, kebutuhan emosional, dan cara mencintai diri sendiri dengan lebih sehat.

Bukan berarti rasa sakit harus dipuji. Tetapi jika luka itu sudah hadir, kita bisa belajar untuk tidak membiarkannya menghancurkan diri sepenuhnya.

## Penutup

Patah hati adalah pengalaman yang bisa membuat seseorang merasa kehilangan arah. Namun, perasaan itu tidak harus dihadapi sendirian.

Berikan waktu untuk diri sendiri. Pelan-pelan terima apa yang terjadi. Jangan memaksa diri untuk langsung baik-baik saja. Dan jika semuanya terasa terlalu berat, carilah bantuan dari orang yang tepat.

Kamu tetap berharga, bahkan ketika seseorang memilih pergi dari hidupmu.

---

**Catatan:** Artikel ini bersifat edukatif dan reflektif. Jika kamu atau orang terdekat sedang mengalami tekanan emosional berat, kehilangan harapan, atau memiliki keinginan untuk menyakiti diri sendiri, segera hubungi orang terpercaya, fasilitas kesehatan terdekat, atau tenaga profesional.
', 'https://res.cloudinary.com/drzkofoof/image/upload/v1780803542/stresskarenapatahhati_mhxh5u.jpg', 'Kesehatan Mental', array['patah hati', 'stres karena patah hati', 'cara move on', 'kesehatan mental', 'luka batin', 'penerimaan diri', 'ikhlas', 'kehilangan', 'penolakan cinta', 'dukungan emosional', 'mental wellness', 'qonsulin.id']::text[], 'published', 'Stres Karena Patah Hati: Cara Berdamai dengan Kehilangan', 'Patah hati bisa memicu stres, sedih, dan kehilangan arah. Pelajari cara berdamai dengan penolakan, menerima kenyataan, dan mencari dukungan saat terasa berat.
', '2026-06-07T03:40:50.55+00:00', '2026-06-05T03:25:46.138+00:00', '2026-06-07T03:40:50.55+00:00'),
  ('c9d40633-2239-45d5-8d12-645841c92a58', 'Lagu lagu playlist penyemangat hidup', 'lagu-lagu-playlist-penyemangat-hidup', 'Lagu penyemangat hidup bisa membantu memberi energi baru saat kamu merasa lelah, galau, atau kehilangan arah. Berikut rekomendasi lagu motivasi Indonesia dan barat yang cocok didengarkan untuk membangkitkan semangat.', '# Rekomendasi Lagu Penyemangat Hidup untuk Bangkit Lagi

Buat kamu yang suka lagu motivasi tapi tidak ingin suasana yang terlalu berat, daftar lagu berikut bisa menjadi pilihan aman.

Lagu-lagu ini enak diputar sambil siap-siap berangkat kerja, sebelum meeting, saat perjalanan, atau ketika kamu butuh sedikit pengingat bahwa kamu tetap berharga dan berhak untuk didengar.

Kalau belakangan hidup terasa berat, coba beri waktu sebentar untuk mendengarkan lagu-lagu yang bisa mengangkat semangatmu lagi. Siapa tahu, dari satu lagu yang tepat, kamu bisa menemukan tenaga baru untuk menghadapi hari.

Karena seberat apa pun keadaan sekarang, selalu ada alasan untuk bangkit dan melanjutkan langkah.

## 1. Sia - Unstoppable

**Judul video:** *Sia - Unstoppable (Official Video - Live from the Nostalgic For The Present Tour)*

Ada hari-hari ketika kamu butuh lagu yang bukan hanya menghibur, tetapi juga benar-benar membantu mengangkat semangat.

Di momen seperti itu, **Unstoppable** dari Sia sering terasa pas. Lagu ini memiliki atmosfer yang kuat, megah, dan membangun rasa percaya diri.

Yang membuat lagu ini menarik adalah campuran antara nuansa rapuh dan kuat. Sebagai lagu tentang perjuangan hidup, lagu ini cocok menggambarkan seseorang yang tetap berjalan meski di dalam dirinya sedang goyah.

Sebagai lagu tentang semangat hidup, beat dan vokalnya memberi kesan besar, seperti sedang masuk ke mode siap menghadapi tantangan.

Lagu ini cocok untuk kamu yang sedang butuh merasa “siap menghadapi apa pun”, meski sebenarnya masih merasa deg-degan. Kadang, sensasi kecil seperti itu sudah cukup membantu untuk mulai bergerak.

## 2. The Script feat. will.i.am - Hall of Fame

**Judul video:** *The Script - Hall of Fame (Official Video) ft. will.i.am*

Kalau kamu mencari lagu yang terasa seperti anthem penyemangat, **Hall of Fame** sulit dilewatkan.

Lagu ini punya energi hidup yang besar sejak awal. Dari judulnya saja sudah terasa bahwa lagu ini berbicara tentang capaian, kerja keras, dan keberanian untuk bermimpi tinggi.

Sebagai lagu tentang perjuangan hidup, **Hall of Fame** menekankan potensi diri. Lagu ini mengingatkan bahwa seseorang bisa melampaui batas yang selama ini dianggap tidak mungkin ditembus.

Sebagai lagu tentang semangat hidup, lagu ini cocok diputar ketika kamu ingin mengingat kembali tujuan jangka panjang. Bukan hanya bertahan untuk hari ini, tetapi juga menatap masa depan dengan lebih yakin.

Memang, bagi sebagian orang, lagu ini terasa sangat megah. Namun, justru di situlah kekuatannya. Ada momen ketika kita membutuhkan lagu yang membuat ruang batin terasa lebih luas dan langkah terasa lebih mantap.

## 3. Laskar Pelangi

**Laskar Pelangi** cocok didengarkan ketika kamu sedang ingin mengingat kembali mimpi dan harapan.

Lagu ini membawa pesan tentang impian, perjuangan, dan keberanian untuk terus berjalan meski keadaan tidak selalu mudah. Nuansanya hangat dan penuh harapan, sehingga cocok untuk menemani fase hidup yang sedang penuh pertanyaan.

## 4. Jangan Menyerah

**Jangan Menyerah** adalah lagu yang mengingatkan bahwa selalu ada harapan, bahkan ketika hidup terasa berat.

Lagu ini cocok untuk kamu yang sedang berada di titik lelah, merasa gagal, atau mulai kehilangan arah. Pesannya sederhana, tetapi kuat: tetap bertahan dan jangan menyerah pada keadaan.

## 5. Sang Dewi

**Sang Dewi** bisa memberi rasa percaya diri dan penghargaan terhadap diri sendiri.

Lagu ini cocok didengarkan ketika kamu sedang ingin mengingat bahwa dirimu tetap berharga, layak dicintai, dan pantas diperlakukan dengan baik.

## 6. Berkibarlah Benderaku

**Berkibarlah Benderaku** memiliki energi yang penuh semangat dan positif.

Lagu ini cocok diputar ketika kamu membutuhkan dorongan energi, rasa bangga, dan semangat untuk kembali bergerak. Nuansanya kuat, tegas, dan membangkitkan motivasi.

## 7. Manusia Kuat

**Manusia Kuat** adalah lagu tentang keteguhan dalam menghadapi hidup.

Lagu ini cocok untuk kamu yang sedang berusaha tetap kuat meski banyak hal terasa tidak mudah. Pesannya mengingatkan bahwa manusia bisa terluka, lelah, bahkan jatuh, tetapi tetap punya kemampuan untuk bangkit.

## Rekomendasi Lagu Barat Penyemangat Hidup

Selain lagu Indonesia, beberapa lagu barat juga bisa menjadi pilihan ketika kamu membutuhkan dorongan semangat.

### 8. Fight Song

**Fight Song** adalah lagu motivasi yang sangat populer.

Lagu ini cocok untuk kamu yang sedang ingin menguatkan diri, mengambil kendali atas hidup, dan kembali percaya bahwa suaramu berarti.

### 9. Roar

**Roar** cocok untuk membangun keberanian dan kepercayaan diri.

Lagu ini membawa energi yang tegas dan membangkitkan semangat, terutama ketika kamu sedang ingin keluar dari rasa takut atau tekanan.

### 10. Stronger (What Doesn''t Kill You)

**Stronger (What Doesn''t Kill You)** adalah lagu tentang bangkit setelah melewati kesulitan.

Lagu ini cocok didengarkan ketika kamu ingin mengubah rasa sakit, kegagalan, atau pengalaman buruk menjadi dorongan untuk tumbuh lebih kuat.

### 11. Unstoppable

**Unstoppable** cocok didengarkan saat kamu butuh dorongan semangat dan rasa percaya diri.

Lagu ini memberi kesan kuat, tangguh, dan siap menghadapi hari, terutama saat kamu sedang merasa ragu dengan kemampuan diri sendiri.

## Kalau Sedang Galau Tapi Ingin Tetap Kuat

Tidak semua lagu penyemangat harus terdengar penuh energi. Kadang, ketika sedang galau, kita justru butuh lagu yang bisa menemani perasaan tanpa membuat kita semakin tenggelam.

Beberapa lagu yang bisa didengarkan antara lain:

### 12. Hidup Untukmu Mati Tanpamu

Lagu ini cocok untuk kamu yang sedang galau dan ingin memberi ruang pada perasaan.

Nuansanya emosional, sehingga bisa menjadi teman ketika kamu sedang memproses rasa kehilangan, rindu, atau kekecewaan.

### 13. Kesempurnaan Cinta

**Kesempurnaan Cinta** cocok untuk suasana hati yang sedang lembut, romantis, atau membutuhkan ketenangan.

Lagu ini bisa menjadi pilihan ketika kamu sedang ingin mendengarkan sesuatu yang lebih ringan, hangat, dan menenangkan.

## Penutup

Pada akhirnya, lagu penyemangat hidup bukan hanya soal musik yang enak didengar, tetapi juga tentang pesan yang bisa membuat hati terasa lebih kuat.

Kadang yang kita butuhkan memang bukan solusi instan, melainkan kalimat sederhana yang mengingatkan bahwa kita masih mampu berjalan, meski pelan.

Dari satu lagu yang tepat, kita bisa menemukan sedikit tenaga baru untuk melanjutkan hari.

---









', 'https://res.cloudinary.com/drzkofoof/image/upload/v1780801310/playlist_avwoyz.jpg', 'Kesehatan mental ', array['lagu penyemangat hidup', 'lagu motivasi', 'lagu semangat', 'lagu untuk bangkit', 'lagu saat galau', 'lagu motivasi barat', 'lagu motivasi indonesia', 'kesehatan mental', 'self healing', 'semangat hidup', 'mental wellness', 'qonsulin.id']::text[], 'published', 'Rekomendasi Lagu Penyemangat Hidup untuk Bangkit Lagi', 'Temukan rekomendasi lagu penyemangat hidup dari Indonesia dan barat yang cocok didengarkan saat lelah, galau, butuh motivasi, atau ingin bangkit lagi.
', '2026-06-07T03:03:21.192+00:00', '2026-06-05T03:09:41.003+00:00', '2026-06-07T03:03:21.192+00:00'),
  ('bda1e522-bab8-42c6-9068-f4c3dc8e2c83', 'Susah Move On dari Tempat Tidur? Yuk Kenalan dengan Clinomania', 'susah-move-on-dari-tempat-tidur-yuk-kenalan-dengan-clinomania', 'Clinomania menggambarkan kecenderungan berlebihan untuk tetap berada di tempat tidur, bahkan ketika hal tersebut mulai mengganggu aktivitas harian, pekerjaan, belajar, atau hubungan sosial. Kenali gejala dan cara menyikapinya dengan tepat.', '# Susah Move On dari Tempat Tidur? Yuk Kenalan dengan Clinomania

**Oleh: Qoni**

Pernah merasa sangat malas beranjak dari tempat tidur?

Hampir semua orang pasti pernah mengalaminya, terutama ketika cuaca sedang dingin dan sangat mendukung untuk kembali menarik selimut lalu bermalas-malasan di atas kasur.

Namun, hati-hati jika keinginan untuk tetap berada di tempat tidur muncul secara berlebihan, bahkan sampai menghilangkan keinginan untuk bersosialisasi dan menjalani aktivitas sehari-hari. Kondisi ini dikenal dengan istilah **Clinomania**.

Lalu, apa sebenarnya clinomania?

## Apa Itu Clinomania?

Clinomania berasal dari dua kata, yaitu **clin** dan **mania**.

- **Clin** berasal dari bahasa Yunani yang berarti *tempat tidur*.
- **Mania** berarti *kecanduan* atau *obsesi yang berlebihan*.

Seseorang yang mengalami clinomania memiliki kecenderungan untuk betah berlama-lama di atas tempat tidur.

Meskipun tidak selalu tidur, penderita clinomania cenderung ingin melakukan hampir semua aktivitasnya di atas tempat tidur, seperti:

- Makan
- Menonton televisi
- Bermain ponsel
- Membaca
- Bekerja atau belajar
- Aktivitas lainnya

Tempat tidur menjadi zona yang terasa paling nyaman sehingga muncul keengganan untuk meninggalkannya.

## Gejala Clinomania

Beberapa tanda yang dapat muncul pada seseorang yang mengalami clinomania antara lain:

1. Ingin menghabiskan sebagian besar waktu di tempat tidur, terutama setelah melakukan aktivitas yang melelahkan.
2. Merasakan kenyamanan yang sangat tinggi saat berada di atas tempat tidur.
3. Sering mencari alasan untuk tidak meninggalkan tempat tidur.
4. Menganggap tidur atau berbaring sebagai aktivitas favorit atau hobi utama.

## Mengapa Clinomania Perlu Diwaspadai?

Clinomania merupakan kondisi yang perlu mendapatkan perhatian karena dapat menimbulkan rasa malas atau kantuk yang berlangsung terus-menerus.

Akibatnya, seseorang menjadi enggan melakukan aktivitas sehari-hari, pekerjaan, belajar, maupun berinteraksi dengan lingkungan sekitar.

Dalam beberapa penelitian disebutkan bahwa seseorang yang mengalami clinomania tidak selalu mengalami depresi. Namun, individu yang mengalami depresi cenderung memiliki risiko lebih besar untuk mengalami clinomania.

Hal ini dapat terjadi karena menurunnya minat dan motivasi untuk melakukan berbagai aktivitas. Akibatnya, tempat tidur menjadi tempat yang dianggap paling nyaman untuk ditinggali dan sulit ditinggalkan.

## Kapan Harus Mencari Bantuan?

Jika keinginan untuk terus berada di tempat tidur mulai mengganggu aktivitas sehari-hari, pekerjaan, pendidikan, hubungan sosial, atau disertai perasaan sedih berkepanjangan dan kehilangan semangat hidup, penting untuk mencari bantuan profesional.

Konsultasi dengan psikolog atau tenaga profesional dapat membantu memahami penyebab yang mendasari kondisi tersebut dan menemukan strategi penanganan yang tepat.

## Penutup

Sesekali bermalas-malasan di atas tempat tidur tentu merupakan hal yang wajar. Namun, ketika keinginan tersebut menjadi berlebihan dan mulai mengganggu fungsi kehidupan sehari-hari, kondisi tersebut tidak boleh diabaikan.

Mengenali gejala sejak dini dapat menjadi langkah awal untuk menjaga kesehatan mental dan kualitas hidup yang lebih baik.

---

## Sumber

1. Tim Penulis Intisari.com. *Clinomania, Obsesi pada Tempat Tidur*. Diakses dari Intisari.com pada 6 April 2019.  
   https://intisari.grid.id/read/0359008/clinomania-obsesi-pada-tempat-tidur?page=all

2. Tim Penulis CNN Indonesia. *Clinomania, Orang yang Susah Lepas dari Kasur Saat Hujan*. Diakses dari CNN Indonesia pada 6 April 2019.  
   https://www.cnnindonesia.com/gaya-hidup/20150209101349-255-30586/clinomania-orang-yang-susah-lepas-dari-kasur-saat-hujan

', 'https://res.cloudinary.com/drzkofoof/image/upload/v1780318291/ChatGPT_Image_Jun_1_2026_07_50_48_PM_epavna.png', 'Kesehatan Mental', array['clinomania', 'susah bangun dari tempat tidur', 'kesehatan mental', 'psikologi', 'gejala clinomania', 'malas beranjak dari kasur', 'depresi', 'self awareness', 'mental wellness', 'qonsulin.id']::text[], 'published', 'Susah Bangun dari Tempat Tidur? Kenali Clinomania dan Gejalanya', 'Clinomania adalah kecenderungan berlebihan untuk terus berada di tempat tidur. Kenali pengertian, gejala, penyebab, dan kapan perlu mencari bantuan.', '2026-06-01T12:51:58.803+00:00', '2026-06-01T12:51:58.803+00:00', '2026-06-01T12:51:58.803+00:00'),
  ('a29a8ff2-d68a-4b04-8de1-72623ac55fb9', 'PARANOIA DAN GANGGUAN DELUSI', 'paranoia-dan-gangguan-delusi', 'Paranoia adalah rasa curiga, takut, atau tidak percaya yang muncul secara berlebihan hingga dapat mengganggu kehidupan sehari-hari. Artikel ini membahas gejala, penyebab, kaitannya dengan delusi, serta cara memberi dukungan yang aman dan empatik.', '# Apakah Itu Paranoia?

Paranoia adalah kondisi ketika seseorang merasa sangat cemas, curiga, atau takut terhadap kemungkinan adanya ancaman, bahaya, atau niat buruk dari orang lain. Perasaan ini bisa muncul dalam berbagai tingkat, mulai dari kecurigaan ringan hingga keyakinan yang sangat kuat dan sulit digoyahkan.

Dalam beberapa kondisi kesehatan mental, paranoia dapat muncul sebagai bagian dari gejala yang lebih kompleks. Pada situasi tertentu, pikiran paranoid juga dapat berkembang menjadi delusi, yaitu keyakinan yang tidak sesuai dengan kenyataan tetapi diyakini sangat kuat oleh seseorang.

Namun, penting untuk dipahami bahwa tidak semua rasa curiga atau takut berarti seseorang mengalami gangguan mental. Setiap orang bisa merasa waspada dalam situasi tertentu. Yang perlu diperhatikan adalah ketika rasa curiga tersebut menjadi berlebihan, sulit dikendalikan, dan mulai mengganggu hubungan sosial, pekerjaan, atau aktivitas sehari-hari.

## Gejala-Gejala Paranoia

Beberapa tanda yang dapat muncul pada seseorang yang mengalami pikiran paranoid antara lain:

1. Merasa curiga secara berlebihan terhadap orang lain.
2. Sulit mempercayai orang lain, bahkan orang terdekat.
3. Merasa ada ancaman atau niat tersembunyi di balik tindakan orang lain.
4. Mudah merasa dikhianati, disakiti, atau dimanfaatkan.
5. Menjadi sangat waspada terhadap lingkungan sekitar.
6. Sulit merasa rileks atau aman.
7. Bersikap defensif ketika menerima kritik.
8. Sering menafsirkan ucapan atau tindakan orang lain sebagai serangan.
9. Mudah terlibat perdebatan karena merasa perlu membela diri.

Gejala-gejala tersebut bisa berbeda pada setiap orang. Jika muncul terus-menerus dan mengganggu kehidupan sehari-hari, sebaiknya kondisi tersebut dibicarakan dengan tenaga profesional.

## Penyebab Paranoia

Penyebab paranoia dapat berkaitan dengan banyak faktor. Tidak selalu ada satu penyebab tunggal yang menjelaskan mengapa seseorang mengalami pikiran paranoid.

Beberapa faktor yang dapat berperan antara lain:

- Pengalaman traumatis
- Perasaan tertekan dalam jangka panjang
- Pengalaman ditolak atau dikhianati
- Stres berat
- Kesepian atau isolasi sosial
- Pola hubungan yang tidak aman
- Kondisi kesehatan mental tertentu
- Pengaruh penggunaan zat tertentu

Pikiran paranoid sering kali berkaitan dengan cara seseorang menafsirkan peristiwa, hubungan, dan pengalaman hidupnya. Ketika rasa takut dan curiga semakin kuat, seseorang bisa semakin menarik diri dari lingkungan, sehingga menjadi lebih sulit untuk mendapatkan bantuan.

## Apakah Itu Delusi atau Khayalan?

Delusi atau khayalan adalah keyakinan yang tidak sesuai dengan kenyataan, tetapi diyakini secara kuat oleh seseorang sebagai sesuatu yang benar.

Seseorang yang mengalami delusi mungkin tetap mempertahankan keyakinannya meskipun ada penjelasan atau bukti yang menunjukkan sebaliknya.

Namun, tidak semua keyakinan yang terdengar tidak biasa dapat disebut delusi. Keyakinan yang berasal dari budaya, agama, atau tradisi tertentu perlu dipahami sesuai konteksnya.

Dua jenis delusi yang sering dibahas dalam literatur kesehatan mental adalah:

- **Delusi keagungan** (*delusions of grandeur*), yaitu keyakinan bahwa diri memiliki kekuatan, status, atau kemampuan luar biasa.
- **Delusi penganiayaan** (*persecutory delusions*), yaitu keyakinan bahwa diri sedang diawasi, diancam, disakiti, atau diperlakukan buruk oleh pihak tertentu.

## Apa Itu Gangguan Delusi?

Gangguan delusi adalah kondisi ketika seseorang memiliki keyakinan kuat yang tidak sesuai dengan kenyataan dan bertahan dalam jangka waktu tertentu.

Keyakinan tersebut bisa tampak sangat tidak mungkin, tetapi dalam beberapa kasus juga bisa terlihat seperti sesuatu yang masih mungkin terjadi. Karena itu, kondisi ini perlu dinilai secara hati-hati oleh profesional, bukan disimpulkan secara mandiri.

Seseorang dengan gangguan delusi mungkin masih dapat menjalani aktivitas sehari-hari, bekerja, atau berinteraksi dengan orang lain. Namun, keyakinan yang kuat tersebut tetap dapat membuat hidup terasa terbatas, penuh ketegangan, dan membuat hubungan sosial menjadi terganggu.

## Bagaimana Cara Mendukung Orang yang Mengalami Paranoia atau Delusi?

Paranoia dan delusi perlu ditangani dengan pendekatan yang hati-hati, aman, dan tidak menghakimi. Dalam beberapa kasus, bantuan profesional seperti psikolog, psikiater, atau tenaga kesehatan mental dapat sangat dibutuhkan.

Dukungan yang bisa diberikan antara lain:

1. **Dengarkan tanpa langsung menghakimi**  
   Hindari mengejek, meremehkan, atau langsung membantah secara keras. Sikap tersebut justru bisa membuat seseorang semakin defensif.

2. **Tetap tenang saat berbicara**  
   Gunakan nada bicara yang lembut dan tidak memaksa. Rasa aman menjadi hal penting dalam proses komunikasi.

3. **Ajak mencari bantuan profesional**  
   Jika pikiran paranoid sudah mengganggu aktivitas, hubungan, atau keselamatan diri, ajakan untuk berkonsultasi dengan profesional perlu dilakukan secara perlahan dan penuh empati.

4. **Jaga batasan diri**  
   Mendukung orang lain bukan berarti harus menanggung semuanya sendiri. Keluarga, teman, atau pendamping juga perlu menjaga kondisi emosionalnya.

5. **Segera cari bantuan darurat jika ada risiko bahaya**  
   Jika seseorang berisiko menyakiti diri sendiri atau orang lain, segera hubungi layanan darurat, fasilitas kesehatan terdekat, atau pihak yang berwenang.

## Penutup

Paranoia bukan sekadar rasa curiga biasa. Ketika rasa takut, curiga, dan tidak percaya mulai terasa berlebihan hingga mengganggu kehidupan sehari-hari, kondisi tersebut perlu diperhatikan dengan serius.

Mengenali gejala sejak awal dapat membantu seseorang mendapatkan dukungan yang lebih tepat. Dengan pendekatan yang aman, empatik, dan profesional, proses pemulihan dan keterhubungan dengan orang lain tetap mungkin dilakukan.

Jika kamu atau orang terdekat sedang mengalami pikiran yang terasa mengganggu dan sulit dikendalikan, jangan ragu untuk mencari bantuan dari tenaga profesional.

---

**Catatan:** Artikel ini bertujuan sebagai edukasi umum dan tidak menggantikan diagnosis, terapi, atau penanganan langsung dari psikolog, psikiater, atau tenaga kesehatan profesional.

**Sumber:**  
Diterjemahkan dan disesuaikan dari [Mental Health America - Paranoia and Delusional Disorders](https://www.mentalhealthamerica.net/conditions/paranoia-and-delusional-disorders) oleh Viena P.

', 'https://res.cloudinary.com/drzkofoof/image/upload/v1780051213/0251b982-b6cf-4946-be8e-2ae1fa4a3700_csyjsn.png', 'kesehatan mental', array['paranoia', 'delusi', 'gangguan delusi', 'kesehatan mental', 'gejala paranoia', 'pikiran paranoid', 'dukungan emosional', 'psikologi', 'mental wellness', 'konsultasi psikologi', 'qonsulin.id']::text[], 'published', 'Apa Itu Paranoia? Kenali Gejala, Penyebab, dan Cara Mendukungnya', 'Kenali apa itu paranoia, gejala yang perlu diperhatikan, kaitannya dengan delusi, serta cara mendukung orang yang mengalaminya secara aman.', '2026-06-07T03:20:29.229+00:00', '2026-05-28T04:09:37.515+00:00', '2026-06-07T03:20:29.229+00:00'),
  ('9dc6ba2a-01d5-44aa-952a-fd391f5a83f4', 'Ketika Ilmu Berkembang, Iman Menuntun: Refleksi atas Psikologi Islam dan Konvensional', 'ketika-ilmu-berkembang-iman-menuntun-refleksi-atas-psikologi-islam-dan-konvensional', 'Psikologi Islam dan Psikologi Konvensional memiliki dasar, tujuan, dan metode yang berbeda. Artikel ini membahas perbedaannya dari sisi tujuan hidup, objek kajian, metode, serta bagaimana keduanya dapat saling melengkapi dalam memahami manusia secara lebih utuh.', '# Perbedaan Psikologi Islam dan Psikologi Konvensional

Psikologi menjadi ilmu yang banyak dibutuhkan oleh masyarakat luas. Tidak seperti dulu, saat ini kajian tentang psikologi ramai diminati, baik yang membahas tentang penyembuhan diri, keluarga, pola asuh, pembentukan kebiasaan, pendidikan, bahkan pernikahan.

Selain topik-topik tersebut, **Psikologi Islam** juga semakin banyak diminati dalam beberapa tahun terakhir. Pertanyaannya, apakah Psikologi Islam memiliki konsep landasan yang sama dengan Psikologi Konvensional?

Pertanyaan tersebut terjawab dalam penelitian yang dilakukan oleh **Bagus Riyono** berjudul *Mengintegrasikan Prinsip-Prinsip Islam dalam Kurikulum Psikologi*. Dalam penelitian tersebut, ia memaparkan tiga hal mendasar yang membedakan Psikologi Islam dan Psikologi Konvensional.

Apa saja perbedaannya? Simak pembahasan berikut sampai selesai.

## 1. Tujuan

Perbedaan utama antara Psikologi Islam dan Psikologi Konvensional terletak pada tujuan akhirnya.

Psikologi Konvensional berfokus pada bagaimana manusia dapat berfungsi dengan baik, bahagia, dan seimbang dalam kehidupan dunia. Setiap aliran memiliki arah yang berbeda. Misalnya, psikoanalisis menekankan kepuasan diri, behaviorisme menekankan keteraturan perilaku, sementara humanistik menekankan kebebasan dan aktualisasi diri.

Meski tujuan-tujuan tersebut tampak baik, semuanya berpusat pada manusia dan pengalaman duniawi. Dengan kata lain, Psikologi Konvensional berusaha membuat manusia bahagia di dunia, tetapi belum tentu memberi arah tentang makna dan kebenaran hidup itu sendiri.

Sebaliknya, Psikologi Islam memandang manusia bukan hanya sebagai makhluk biologis dan psikologis, tetapi juga sebagai makhluk spiritual yang memiliki tujuan hidup lebih tinggi.

Tujuan utama Psikologi Islam bukan sekadar kebahagiaan atau keseimbangan, melainkan menuntun manusia untuk mengenal dirinya dan Tuhannya agar mampu menjalani hidup sesuai petunjuk Allah.

Dengan begitu, kebahagiaan bukan hanya diukur dari rasa nyaman atau pencapaian diri, tetapi juga dari sejauh mana seseorang hidup dengan benar, berakhlak mulia, dan mempersiapkan diri untuk kembali kepada Allah dalam keadaan terbaik.

## 2. Objek Penelitian

Perbedaan mendasar antara Psikologi Islam dan Psikologi Konvensional juga terletak pada objek kajiannya.

Psikologi Konvensional terus mengalami pergeseran fokus, mulai dari jiwa bawah sadar dalam psikoanalisis, perilaku yang tampak dalam behaviorisme, kebutuhan manusia dalam humanistik, kecerdasan dalam kognitif, hingga otak dan sistem saraf dalam neurosains.

Pergeseran ini membuat Psikologi Konvensional dapat kehilangan arah apabila objek kajiannya tidak lagi berakar pada tujuan yang jelas tentang makna hidup manusia.

Sebaliknya, Psikologi Islam sejak awal memiliki objek kajian yang tetap, yaitu **nafs**, jiwa, atau diri manusia sebagaimana disebut dalam Al-Qur’an.

Dalam kerangka ini, manusia dipahami melalui dimensi spiritualnya, dengan **qalb** atau hati sebagai pusat kesadaran, moralitas, dan kepribadian.

Karena itu, studi kepribadian dalam Psikologi Islam tidak berhenti pada perilaku atau sifat lahiriah, tetapi juga menyentuh aspek akhlak, yaitu bagaimana seseorang memperbaiki dirinya agar memiliki hati yang bersih dan akhlak yang mulia.

## 3. Metode

Perbedaan mendasar metode dalam Psikologi Islam dan Psikologi Konvensional terletak pada landasan filosofis dan arah penyelidikannya.

Psikologi Konvensional berakar pada paradigma positivistik dan fenomenologis yang menekankan pengamatan empiris terhadap perilaku, pikiran, atau aktivitas otak manusia.

Pendekatan ini sering kali memisahkan antara aspek lahiriah dan spiritual manusia karena hanya berfokus pada hal-hal yang dapat diukur dan diamati.

Sebaliknya, Psikologi Islam menggunakan metodologi **Maqasid**, yang berangkat dari kesadaran bahwa ilmu adalah sarana untuk memahami tanda-tanda Allah dalam diri manusia dan alam semesta.

Proses penyelidikannya bersifat holistik, yaitu menggabungkan data empiris dengan refleksi spiritual melalui Al-Qur’an dan Hadis.

Tujuannya bukan hanya menjelaskan perilaku manusia, tetapi juga menuntun manusia memahami makna hidupnya dan mengarahkan ilmunya untuk kemaslahatan serta mendekatkan diri kepada Allah.

## Apakah Psikologi Islam dan Psikologi Konvensional Dapat Diintegrasikan?

Temuan-temuan dari Psikologi Konvensional memang dapat diintegrasikan secara selektif untuk memperkaya pengetahuan psikologi dalam paradigma Islam.

Begitu pula, teori-teori Psikologi Islam dapat memberikan wawasan mendalam terhadap berbagai isu yang dikaji oleh Psikologi Konvensional.

Namun, meskipun ilmu terus berkembang dan selalu terbuka terhadap pembaruan, Psikologi Islam memiliki batas nilai yang tidak berubah karena berakar pada iman dan wahyu.

Artinya, pendekatan, metode, dan teori dalam Psikologi Islam dapat berkembang mengikuti zaman, tetapi prinsip dasarnya, yakni pandangan tentang hakikat manusia, tujuan hidup, dan arah perkembangan jiwa, tetap berpijak pada ajaran Allah.

Dengan cara ini, Psikologi Islam tetap ilmiah sekaligus spiritual. Ia dapat berkembang tanpa kehilangan arah karena pertumbuhannya selalu dijaga oleh cahaya iman.

## Contoh Integrasi dalam Kehidupan

Sebagai contoh, anak-anak dengan kebutuhan khusus atau **ABK** membutuhkan pendekatan psikologi dan neurosains untuk memahami dinamika perilaku, potensi, serta cara kerja otaknya. Dengan begitu, terapi dapat dilakukan dengan lebih tepat dan efektif.

Dalam konteks ini, Psikologi Islam dapat menambahkan dimensi makna dan nilai spiritual, dengan memandang anak bukan sekadar individu yang perlu diperbaiki, tetapi sebagai jiwa yang memiliki fitrah dan tujuan mulia di hadapan Allah.

Pendekatan ini membantu orang tua, pendidik, dan terapis untuk tidak hanya fokus pada kemampuan lahiriah anak, tetapi juga membangun penerimaan diri, kasih sayang, serta hubungan spiritual yang memperkuat proses penyembuhan dan pertumbuhan anak secara utuh.

## Kesimpulan

Menurut hemat penulis, menjadi sebuah kesyukuran bahwa kita hidup di masa ketika kekayaan ilmu dapat tumbuh dari dua arah yang saling melengkapi, yaitu Psikologi Konvensional dan Psikologi Islam.

Keduanya memang tidak dapat disamakan karena berangkat dari dasar dan tujuan yang berbeda. Namun, justru di situlah letak keindahannya.

Psikologi Konvensional memberi kita pemahaman mendalam tentang aspek empiris dan ilmiah manusia, sementara Psikologi Islam menghadirkan panduan nilai dan makna yang menuntun arah kehidupan.

Dari pertemuan keduanya, kita belajar bahwa ilmu tidak harus dipertentangkan, tetapi dapat disyukuri dan dimanfaatkan bersama untuk memahami, menyembuhkan, dan menolong manusia agar hidup lebih utuh, baik secara jasmani, akal, maupun jiwa.

---

**Penulis:** Relung Fajar Sukmawati  
**Foto:** Zulfugar Karimov, Pexels.com

', 'https://kanal.psikologi.ugm.ac.id/wp-content/uploads/sites/408/2025/11/pexels-zulfugarkarimov-34700090-677x510.jpg', 'Artikel Psikologi', array['psikologi islam', 'psikologi konvensional', 'perbedaan psikologi islam dan konvensional', 'kesehatan mental', 'psikologi', 'maqasid', 'nafs', 'qalb', 'spiritualitas', 'mental wellness', 'pendidikan psikologi', 'qonsulin.id']::text[], 'published', 'Perbedaan Psikologi Islam dan Psikologi Konvensional', 'Kenali perbedaan Psikologi Islam dan Psikologi Konvensional dari sisi tujuan, objek kajian, metode, serta peluang integrasinya dalam kehidupan.', '2026-06-07T03:06:52.792+00:00', '2026-05-27T08:05:02.801+00:00', '2026-06-07T03:06:52.792+00:00')
on conflict (slug) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  cover_image_url = excluded.cover_image_url,
  category = excluded.category,
  tags = excluded.tags,
  status = excluded.status,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  published_at = excluded.published_at,
  updated_at = excluded.updated_at;

insert into public.activities (id, title, description, type, source_url, image_url, date, status, created_at, updated_at)
values
  ('bf977db8-aba1-4b54-900e-b16a74f6994f', 'Webinar Quarter life crisis di era AI ', '# Webinar: Quarter Life Crisis di Era AI

Di umur sekarang, pernah nggak sih kamu merasa bingung harus mulai dari mana?

Takut tertinggal, takut gagal, bahkan takut digantikan oleh AI. Padahal, yang sedang kamu alami bisa jadi bukan malas, tapi **Quarter Life Crisis**.

Di era perkembangan AI yang semakin cepat, banyak anak muda mulai mempertanyakan arah hidup, karier, bahkan *value* diri sendiri.

Karena itu, webinar ini hadir untuk membantu kamu memahami keresahan tersebut sekaligus belajar cara beradaptasi tanpa kehilangan diri sendiri.

## Apa yang Akan Kamu Dapatkan?

✅ Insight dan knowledge tentang **Quarter Life Crisis di Era AI**  
✅ Perspektif baru untuk menghadapi masa depan  
✅ Relasi dan pengalaman baru  
✅ E-Certificate  
✅ Hadiah menarik berupa saldo GoPay untuk 4 orang pemenang 🎁🤩  

## Detail Acara

📆 **Hari/Tanggal:** Sabtu, 30 Mei 2026  
⏰ **Waktu:** 15.00 - selesai  
📍 **Tempat:** Zoom Meeting  
👤 **Peserta:** Terbuka untuk umum  
💸 **Biaya:** Gratis  

## Timeline Pendaftaran

📌 **27 Mei - 30 Mei 2026**

## Link Pendaftaran

📲 Daftar sekarang di:

[https://bit.ly/QuarterLifeCrisisdiEraAI](https://bit.ly/QuarterLifeCrisisdiEraAI)

## Penutup

Karena di tengah dunia yang terus berubah, yang paling penting bukan siapa yang paling cepat, tapi siapa yang paling siap berkembang.

Yuk, ikut dan temukan jawaban dari keresahan yang selama ini mungkin kamu pendam sendiri.

---

🔥 **KUOTA TERBATAS — segera amankan tempatmu sekarang!**  

📞 **Contact Person:** +628815177050 (Annisa)', 'event', 'https://www.instagram.com/p/DY2I7d9PdXO/?igsh=MXZuYjFob2h4d3JzMw==', 'https://res.cloudinary.com/drzkofoof/image/upload/v1780051437/1d8eb6bd-841d-4d5d-8a10-ba8aae678190_kpdlhb.jpg', '30 mei 2026', 'published', '2026-05-27T12:53:39.733+00:00', '2026-05-29T10:44:21.746+00:00')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  type = excluded.type,
  source_url = excluded.source_url,
  image_url = excluded.image_url,
  date = excluded.date,
  status = excluded.status,
  updated_at = excluded.updated_at;

-- No rows for public.testimonials

-- No rows for public.lead_magnets

-- No rows for public.gallery_events

-- No rows for public.gallery_media

insert into public.streaming_videos (id, title, slug, description, video_url, thumbnail_url, source_label, status, stream_type, published_at, live_at, sort_order, is_featured, created_at, updated_at)
values
  ('05b1aae8-ec73-4f89-a285-5c8fdde7166f', 'Kamu ga harus kuat sendiri', 'kamu-ga-harus-kuat-sendiri', 'Kamu g harus kuat sendiri,Ada ruang aman bercerita di Qonsulin Yukkonsultasi tanpa takut dihakimi ♥️', 'https://www.youtube.com/shorts/7CWm6D9L1ic?feature=share', 'https://www.youtube.com/shorts/7CWm6D9L1ic', 'QONSULIN.ID', 'published', 'offline', '2026-05-28', null, 0, false, '2026-05-28T10:48:41.671+00:00', '2026-05-28T10:48:41.671+00:00'),
  ('48d6da2c-704f-43aa-9ea1-75bbbc3b6d7f', 'Webinar Series Era Kartini Digital', 'webinar-series-era-kartini-digital', null, 'https://youtu.be/wrVnOKncBpI', 'https://www.youtube.com/watch?v=wrVnOKncBpI', 'QONSULIN.ID', 'published', 'offline', '2026-05-28', '2022-04-16T08:00:00+00:00', -1, false, '2026-05-28T10:45:44.348+00:00', '2026-05-28T10:45:44.348+00:00')
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  video_url = excluded.video_url,
  thumbnail_url = excluded.thumbnail_url,
  source_label = excluded.source_label,
  status = excluded.status,
  stream_type = excluded.stream_type,
  published_at = excluded.published_at,
  live_at = excluded.live_at,
  sort_order = excluded.sort_order,
  is_featured = excluded.is_featured,
  updated_at = excluded.updated_at;

-- =========================================================
-- VERIFICATION: run result should show every table exists
-- and row counts should appear below.
-- =========================================================
select
  to_regclass('public.admin_users') as admin_users,
  to_regclass('public.blog_posts') as blog_posts,
  to_regclass('public.activities') as activities,
  to_regclass('public.testimonials') as testimonials,
  to_regclass('public.lead_magnets') as lead_magnets,
  to_regclass('public.gallery_events') as gallery_events,
  to_regclass('public.gallery_media') as gallery_media,
  to_regclass('public.streaming_videos') as streaming_videos,
  to_regclass('public.companions') as companions;

select 'admin_users' as table_name, count(*) from public.admin_users
union all
select 'blog_posts', count(*) from public.blog_posts
union all
select 'activities', count(*) from public.activities
union all
select 'testimonials', count(*) from public.testimonials
union all
select 'lead_magnets', count(*) from public.lead_magnets
union all
select 'gallery_events', count(*) from public.gallery_events
union all
select 'gallery_media', count(*) from public.gallery_media
union all
select 'streaming_videos', count(*) from public.streaming_videos
union all
select 'companions', count(*) from public.companions;
