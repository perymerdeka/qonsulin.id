-- =========================================================
-- QONSULIN.ID COMPANIONS MIGRATION
-- Copy file ini ke Supabase SQL Editor, lalu Run.
-- Aman dijalankan ulang.
-- =========================================================

create extension if not exists pgcrypto;

do $$ begin
  create type public.content_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null;
end $$;

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

drop trigger if exists touch_companions_updated_at on public.companions;
create trigger touch_companions_updated_at before update on public.companions for each row execute function public.touch_updated_at();

alter table public.companions enable row level security;

drop policy if exists "Public can read published companions" on public.companions;
create policy "Public can read published companions" on public.companions for select using (status = 'published');

drop policy if exists "Admins manage companions" on public.companions;
create policy "Admins manage companions" on public.companions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

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

select 'companions' as table_name, count(*) from public.companions;
