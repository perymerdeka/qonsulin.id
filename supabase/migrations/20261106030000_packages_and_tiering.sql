-- Sprint 2: Packages & Membership Tiering

-- 1. Consultation & Membership Packages table
create table if not exists public.consultation_packages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null check (category in ('membership', 'consultation')),
  price numeric not null default 0 check (price >= 0),
  original_price numeric check (original_price >= price),
  duration_days int default null,
  letter_quota int default null, -- -1 for unlimited, null for consultation
  description text,
  badge text,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists touch_consultation_packages_updated_at on public.consultation_packages;
create trigger touch_consultation_packages_updated_at
  before update on public.consultation_packages
  for each row execute function public.touch_updated_at();

-- 2. Orders & Manual Payment Activations table
create table if not exists public.package_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  package_id uuid references public.consultation_packages(id) on delete cascade,
  package_code text not null,
  package_name text not null,
  amount numeric not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected', 'expired')),
  buyer_name text,
  buyer_contact text,
  notes text,
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists touch_package_orders_updated_at on public.package_orders;
create trigger touch_package_orders_updated_at
  before update on public.package_orders
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.consultation_packages enable row level security;
alter table public.package_orders enable row level security;

-- Public can read active packages
drop policy if exists "Public can read active packages" on public.consultation_packages;
create policy "Public can read active packages"
  on public.consultation_packages
  for select
  using (is_active = true);

-- Authenticated members can read their own orders
drop policy if exists "Members can read own orders" on public.package_orders;
create policy "Members can read own orders"
  on public.package_orders
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Anyone can insert orders (creates pending manual checkout)
drop policy if exists "Anyone can insert orders" on public.package_orders;
create policy "Anyone can insert orders"
  on public.package_orders
  for insert
  with check (true);

-- Function for admin to activate order and upgrade member tier if membership
create or replace function public.activate_package_order(target_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ord record;
  pkg record;
begin
  select * into ord from public.package_orders where id = target_order_id;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Pesanan tidak ditemukan.');
  end if;

  select * into pkg from public.consultation_packages where id = ord.package_id;

  update public.package_orders
  set status = 'active',
      activated_at = now(),
      expires_at = case
        when pkg.duration_days is not null then now() + (pkg.duration_days || ' days')::interval
        else null
      end
  where id = target_order_id;

  if ord.user_id is not null and pkg.category = 'membership' and ord.package_code = 'member_premium' then
    update public.member_profiles
    set tier = 'premium'
    where id = ord.user_id;
  end if;

  return jsonb_build_object('ok', true, 'message', 'Pesanan berhasil diaktifkan.');
end;
$$;

-- Seed default initial packages
insert into public.consultation_packages (code, name, category, price, original_price, duration_days, letter_quota, description, badge, features, is_active, sort_order)
values
  (
    'member_free',
    'Member Free',
    'membership',
    0,
    0,
    null,
    3,
    'Akses dasar menulis surat batin dan membaca cerita anonim di kolam komunitas.',
    'Gratis',
    '["3 Surat Batin per bulan", "Akses Kolam Surat Anonim", "Pilihan avatar emosi dasar", "Dukungan Community Support", "100% Anonim & Privat"]'::jsonb,
    true,
    1
  ),
  (
    'member_premium',
    'Member Premium',
    'membership',
    19000,
    39000,
    30,
    -1,
    'Ruang katarsis tanpa batas dengan seluruh tema kertas dan cap segel lilin eksklusif.',
    'Pilihan Populer',
    '["Kirim surat batin tanpa batas kuota", "Buka seluruh tema kertas digital eksklusif", "Akses cap segel lilin (wax seal) emas", "Surat diprioritaskan di Kolam Komunitas", "Dukungan berkelanjutan"]'::jsonb,
    true,
    2
  ),
  (
    'konseling_sebaya',
    'Konseling Teman Dengar (Sebaya)',
    'consultation',
    35000,
    50000,
    null,
    null,
    'Sesi 1-on-1 privat 45-60 menit bersama konselor sebaya terlatih untuk luapan emosi & overthinking.',
    'Terjangkau',
    '["Sesi 1-on-1 via Chat WhatsApp / Call 45-60 menit", "Didampingi Peer Counselor terlatih", "Ruang aman tanpa stigma & tanpa menghakimi", "Cocok untuk burnout, bad day, & curhat terarah", "Rangkuman refleksi setelah sesi"]'::jsonb,
    true,
    3
  ),
  (
    'psikolog_klinis',
    'Konseling Psikolog Klinis',
    'consultation',
    129000,
    175000,
    null,
    null,
    'Pendampingan profesional berwenang untuk eksplorasi trauma, kecemasan akut, dan intervensi klinis mendalam.',
    'Profesional Berwenang',
    '["Sesi privat 60 menit bersama Psikolog S.Psi., M.Psi.", "Intervensi psikologis terarah & mendalam", "Asesmen klinis & pemetaan akar masalah", "Pendampingan etis & terikat kode etik HIMPSI", "Bukan diagnosa sembarangan"]'::jsonb,
    true,
    4
  )
on conflict (code) do nothing;