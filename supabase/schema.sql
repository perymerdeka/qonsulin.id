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
