-- Keep membership policy editable from the package catalog while enforcing it server-side.

alter table public.consultation_packages
  add column if not exists membership_tier text,
  add column if not exists screening_quota int;

alter table public.consultation_packages
  drop constraint if exists consultation_packages_membership_tier_check;
alter table public.consultation_packages
  add constraint consultation_packages_membership_tier_check
  check (membership_tier is null or membership_tier in ('free', 'premium'));

alter table public.consultation_packages
  drop constraint if exists consultation_packages_screening_quota_check;
alter table public.consultation_packages
  add constraint consultation_packages_screening_quota_check
  check (screening_quota is null or screening_quota >= -1);

update public.consultation_packages
set membership_tier = case code
  when 'member_free' then 'free'
  when 'member_premium' then 'premium'
  else membership_tier
end,
screening_quota = case
  when category = 'membership' and screening_quota is null then 1
  else screening_quota
end
where category = 'membership';

alter table public.consultation_packages
  drop constraint if exists consultation_packages_membership_policy_check;
alter table public.consultation_packages
  add constraint consultation_packages_membership_policy_check
  check (category <> 'membership' or membership_tier is not null);

create table if not exists public.membership_policy_versions (
  id bigint generated always as identity primary key,
  package_id uuid not null references public.consultation_packages(id),
  tier text not null check (tier in ('free', 'premium')),
  letter_quota int not null check (letter_quota >= -1),
  screening_quota int not null check (screening_quota >= -1),
  effective_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.membership_policy_versions enable row level security;

insert into public.membership_policy_versions (package_id, tier, letter_quota, screening_quota, effective_at)
select id, membership_tier, coalesce(letter_quota, case when membership_tier = 'free' then 3 else -1 end),
       coalesce(screening_quota, 1), '-infinity'::timestamptz
from public.consultation_packages
where category = 'membership' and membership_tier is not null;

alter table public.package_orders
  add column if not exists membership_policy_snapshot jsonb;

update public.package_orders orders
set membership_policy_snapshot = jsonb_build_object(
  'tier', package.membership_tier,
  'letter_quota', coalesce(package.letter_quota, case when package.membership_tier = 'free' then 3 else -1 end),
  'screening_quota', coalesce(package.screening_quota, 1),
  'duration_days', package.duration_days
)
from public.consultation_packages package
where orders.package_id = package.id and package.category = 'membership'
  and package.membership_tier is not null and orders.membership_policy_snapshot is null;

create or replace function public.record_membership_policy_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.category = 'membership' and new.membership_tier is not null and tg_op = 'INSERT' then
    insert into public.membership_policy_versions (package_id, tier, letter_quota, screening_quota, effective_at)
    values (new.id, new.membership_tier,
      coalesce(new.letter_quota, case when new.membership_tier = 'free' then 3 else -1 end),
      coalesce(new.screening_quota, 1),
      case when new.membership_tier = 'free' then
        (date_trunc('month', now() at time zone 'Asia/Jakarta') + interval '1 month') at time zone 'Asia/Jakarta'
      else now() end);
  elsif new.category = 'membership' and new.membership_tier is not null and
    (old.letter_quota, old.screening_quota, old.membership_tier)
      is distinct from (new.letter_quota, new.screening_quota, new.membership_tier) then
    insert into public.membership_policy_versions (package_id, tier, letter_quota, screening_quota, effective_at)
    values (new.id, new.membership_tier,
      coalesce(new.letter_quota, case when new.membership_tier = 'free' then 3 else -1 end),
      coalesce(new.screening_quota, 1),
      case when new.membership_tier = 'free' then
        (date_trunc('month', now() at time zone 'Asia/Jakarta') + interval '1 month') at time zone 'Asia/Jakarta'
      else now() end);
  end if;
  return new;
end;
$$;
create trigger record_membership_policy_version
after insert or update on public.consultation_packages
for each row execute function public.record_membership_policy_version();

create or replace function public.snapshot_membership_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare pkg public.consultation_packages%rowtype;
begin
  select * into pkg from public.consultation_packages where id = new.package_id;
  if pkg.category = 'membership' and pkg.membership_tier is not null then
    new.membership_policy_snapshot := jsonb_build_object(
      'tier', pkg.membership_tier,
      'letter_quota', coalesce(pkg.letter_quota, case when pkg.membership_tier = 'free' then 3 else -1 end),
      'screening_quota', coalesce(pkg.screening_quota, 1),
      'duration_days', pkg.duration_days
    );
  end if;
  return new;
end;
$$;
create trigger snapshot_membership_order before insert on public.package_orders
for each row execute function public.snapshot_membership_order();

create or replace function public.create_package_order(p_package_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_package public.consultation_packages%rowtype;
  v_alias text;
  v_order_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'Masuk ke akun member terlebih dahulu untuk membuat pesanan.');
  end if;
  if p_package_code is distinct from 'member_premium' then
    return jsonb_build_object('ok', false, 'message', 'Hanya paket Member Premium yang tersedia untuk dipesan pada MVP persuratan.');
  end if;

  select * into v_package from public.consultation_packages
  where code = p_package_code and category = 'membership' and is_active = true;
  if not found or v_package.price <= 0 then
    return jsonb_build_object('ok', false, 'message', 'Paket tidak tersedia untuk dipesan.');
  end if;

  select alias into v_alias from public.member_profiles where id = v_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Profil member tidak ditemukan.');
  end if;
  select id into v_order_id from public.package_orders
  where user_id = v_user_id and package_id = v_package.id and status = 'pending'
    and created_at >= now() - interval '24 hours'
  order by created_at desc limit 1;

  if v_order_id is null then
    insert into public.package_orders (user_id, package_id, package_code, package_name, amount, status, buyer_name)
    values (v_user_id, v_package.id, v_package.code, v_package.name, v_package.price, 'pending', v_alias)
    returning id into v_order_id;
  end if;

  return jsonb_build_object('ok', true, 'order_id', v_order_id, 'status', 'pending');
end;
$$;

-- Every entitlement is resolved from the current membership policy and active order.
-- The order expiry remains the source of truth for paid membership eligibility.
create or replace function public.get_member_letter_quota(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text := 'free';
  v_letter_limit int := 3;
  v_screening_limit int := 1;
  v_letter_used int := 0;
  v_screening_used int := 0;
  v_has_open_screening boolean := false;
  v_month_start timestamptz;
begin
  if auth.uid() is distinct from p_user_id and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Tidak berwenang membaca kuota pengguna lain.';
  end if;

  update public.package_orders
  set status = 'expired'
  where user_id = p_user_id
    and status = 'active'
    and expires_at is not null
    and expires_at <= now();

  select (orders.membership_policy_snapshot->>'letter_quota')::int,
         (orders.membership_policy_snapshot->>'screening_quota')::int
  into v_letter_limit, v_screening_limit
  from public.package_orders orders
  join public.consultation_packages package on package.id = orders.package_id
  where orders.user_id = p_user_id
    and orders.status = 'active'
    and package.category = 'membership'
    and orders.membership_policy_snapshot->>'tier' = 'premium'
    and (orders.expires_at is null or orders.expires_at > now())
  order by orders.expires_at desc nulls last, orders.activated_at desc nulls last
  limit 1;

  if found then
    v_tier := 'premium';
    v_letter_limit := coalesce(v_letter_limit, -1);
    v_screening_limit := coalesce(v_screening_limit, 1);
  else
    select policy.letter_quota, policy.screening_quota
    into v_letter_limit, v_screening_limit
    from public.membership_policy_versions policy
    where policy.tier = 'free' and policy.effective_at <= now()
    order by policy.effective_at desc, policy.id desc
    limit 1;

    v_letter_limit := coalesce(v_letter_limit, 3);
    v_screening_limit := coalesce(v_screening_limit, 1);
  end if;

  update public.member_profiles
  set tier = v_tier
  where id = p_user_id and tier is distinct from v_tier;

  v_month_start := date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';

  select count(*) into v_letter_used
  from public.letters letter
  join public.letter_threads thread on thread.id = letter.thread_id
  where letter.sender_id = p_user_id
    and letter.is_opening = true
    and thread.delivery_mode = 'public'
    and letter.created_at >= v_month_start;

  select count(*) into v_screening_used
  from public.letter_threads
  where author_id = p_user_id
    and delivery_mode = 'special'
    and special_destination = 'screening'
    and created_at >= v_month_start;

  select exists (
    select 1
    from public.letter_threads
    where author_id = p_user_id
      and delivery_mode = 'special'
      and special_destination = 'screening'
      and handling_status in ('waiting', 'assigned', 'in_progress', 'needs_attention')
  ) into v_has_open_screening;

  return jsonb_build_object(
    'tier', v_tier,
    'used', v_letter_used,
    'limit', v_letter_limit,
    'remaining', case when v_letter_limit = -1 then -1 else greatest(0, v_letter_limit - v_letter_used) end,
    'can_send', v_letter_limit = -1 or v_letter_used < v_letter_limit,
    'screening_used', v_screening_used,
    'screening_limit', v_screening_limit,
    'screening_remaining', case when v_screening_limit = -1 then -1 else greatest(0, v_screening_limit - v_screening_used) end,
    'can_request_screening', (v_screening_limit = -1 or v_screening_used < v_screening_limit) and not v_has_open_screening,
    'has_open_screening', v_has_open_screening
  );
end;
$$;

create or replace function public.activate_package_order(target_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.package_orders%rowtype;
  pkg public.consultation_packages%rowtype;
begin
  select * into ord from public.package_orders where id = target_order_id for update;
  if not found or ord.status <> 'pending' then
    return jsonb_build_object('ok', false, 'message', 'Pesanan tidak ditemukan atau sudah diproses.');
  end if;

  select * into pkg from public.consultation_packages where id = ord.package_id;
  if not found or pkg.code <> ord.package_code then
    return jsonb_build_object('ok', false, 'message', 'Paket pesanan tidak valid.');
  end if;
  if pkg.category = 'membership' and ord.user_id is null then
    return jsonb_build_object('ok', false, 'message', 'Pesanan membership harus terhubung dengan akun member.');
  end if;

  update public.package_orders
  set status = 'active',
      activated_at = now(),
      expires_at = case when pkg.category = 'membership' and ord.membership_policy_snapshot->>'duration_days' is not null
        then now() + ((ord.membership_policy_snapshot->>'duration_days')::int * interval '1 day')
        when pkg.category <> 'membership' and pkg.duration_days is not null then now() + (pkg.duration_days * interval '1 day')
        else null end
  where id = target_order_id;

  if pkg.category = 'membership' then
    update public.member_profiles
    set tier = coalesce(ord.membership_policy_snapshot->>'tier', 'free')
    where id = ord.user_id;
  end if;

  return jsonb_build_object('ok', true, 'message', 'Pesanan telah diverifikasi dan diaktifkan.');
end;
$$;

-- Screening is a private intake, not a paid professional consultation.
alter table public.letter_threads
  drop constraint if exists letter_threads_special_destination_check;
alter table public.letter_threads
  add constraint letter_threads_special_destination_check
  check (special_destination is null or special_destination in ('screening', 'mentor', 'counselor'));

create or replace function public.send_special_letter(
  p_destination text,
  p_title text,
  p_content text,
  p_template_code text default 'vintage_parchment'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_entitlement jsonb;
  v_tier text;
  v_template public.letter_templates%rowtype;
  v_thread_id uuid;
  v_letter_id uuid;
  v_handling_status text := 'waiting';
begin
  if v_user_id is null then return jsonb_build_object('ok', false, 'message', 'Sesi login tidak valid.'); end if;
  if p_destination is distinct from 'screening' then return jsonb_build_object('ok', false, 'message', 'Hanya permintaan dukungan awal yang tersedia pada MVP persuratan.'); end if;
  if p_content is null or char_length(trim(p_content)) < 10 then return jsonb_build_object('ok', false, 'message', 'Isi surat minimal 10 karakter.'); end if;
  if char_length(trim(p_content)) > 3000 or char_length(coalesce(p_title, '')) > 80 then return jsonb_build_object('ok', false, 'message', 'Isi surat maksimal 3000 karakter dan judul maksimal 80 karakter.'); end if;

  perform 1 from public.member_profiles where id = v_user_id for update;
  if not found then return jsonb_build_object('ok', false, 'message', 'Profil member tidak ditemukan.'); end if;
  v_entitlement := public.get_member_letter_quota(v_user_id);
  v_tier := coalesce(v_entitlement->>'tier', 'free');

  if not coalesce((v_entitlement->>'can_request_screening')::boolean, false) then
    return jsonb_build_object('ok', false, 'message', case when coalesce((v_entitlement->>'has_open_screening')::boolean, false)
      then 'Permintaan dukungan awalmu masih diproses. Kamu akan mendapat pembaruan dari tim Qonsulin.'
      else 'Kuota permintaan dukungan awal bulan ini telah digunakan.'
    end);
  end if;

  select * into v_template from public.letter_templates where code = p_template_code and is_active = true;
  if not found then return jsonb_build_object('ok', false, 'message', 'Tema surat tidak tersedia.'); end if;
  if v_template.tier_required = 'premium' and v_tier <> 'premium' then return jsonb_build_object('ok', false, 'message', 'Tema kertas ini eksklusif untuk Member Premium.'); end if;
  if p_content ~* '(bunuh diri|akhiri hidup|suicide|sayat tangan|mengakhiri hidupku)' then v_handling_status := 'needs_attention'; end if;

  insert into public.letter_threads (author_id, topic, status, delivery_mode, special_destination, handling_status)
  values (v_user_id, 'Permintaan Dukungan Awal', 'open', 'special', 'screening', v_handling_status)
  returning id into v_thread_id;

  insert into public.letters (thread_id, sender_id, is_opening, reply_type, template_code, title, content, moderation_status)
  values (v_thread_id, v_user_id, true, 'community', p_template_code, nullif(trim(p_title), ''), trim(p_content), 'approved')
  returning id into v_letter_id;

  return jsonb_build_object('ok', true, 'thread_id', v_thread_id, 'letter_id', v_letter_id, 'handling_status', v_handling_status, 'is_crisis_hold', v_handling_status = 'needs_attention');
end;
$$;
create or replace function public.send_reply_letter(
  p_thread_id uuid,
  p_content text,
  p_template_code text default 'vintage_parchment',
  p_reply_type text default 'community'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tier text;
  v_thread record;
  v_template public.letter_templates%rowtype;
  v_letter_id uuid;
  v_status text := 'pending';
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sesi login tidak valid.');
  end if;
  if p_content is null or length(trim(p_content)) < 10 then
    return jsonb_build_object('ok', false, 'message', 'Balasan surat minimal 10 karakter.');
  end if;

  select * into v_thread from public.letter_threads where id = p_thread_id;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Surat belum tersedia untuk dibalas.');
  end if;
  if v_thread.delivery_mode <> 'public' then
    return jsonb_build_object('ok', false, 'message', 'Surat tujuan khusus hanya dapat ditangani oleh admin Qonsulin.');
  end if;
  if v_thread.status = 'closed' then
    return jsonb_build_object('ok', false, 'message', 'Percakapan surat ini telah ditutup.');
  end if;
  if v_thread.status = 'blocked' then
    return jsonb_build_object('ok', false, 'message', 'Percakapan surat ini telah diblokir.');
  end if;
  if not exists (
    select 1 from public.letters opening
    where opening.thread_id = p_thread_id
      and opening.is_opening = true
      and opening.moderation_status = 'approved'
  ) then
    return jsonb_build_object('ok', false, 'message', 'Surat belum tersedia untuk dibalas.');
  end if;
  if exists (
    select 1 from public.letters opening
    where opening.thread_id = p_thread_id
      and opening.is_opening = true
      and opening.sender_id = v_user_id
  ) then
    return jsonb_build_object('ok', false, 'message', 'Kamu tidak dapat membalas suratmu sendiri. Tunggu balasan dari kawan cerita.');
  end if;

  v_tier := coalesce(public.get_member_letter_quota(v_user_id)->>'tier', 'free');
  select * into v_template from public.letter_templates where code = p_template_code and is_active = true;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Tema surat tidak tersedia.');
  end if;
  if v_template.tier_required = 'premium' and coalesce(v_tier, 'free') <> 'premium' then
    return jsonb_build_object('ok', false, 'message', 'Tema kertas ini eksklusif untuk Member Premium.');
  end if;
  if p_reply_type <> 'community' then
    return jsonb_build_object('ok', false, 'message', 'Label relawan dan profesional hanya diberikan oleh admin yang berwenang.');
  end if;
  if p_content ~* '(bunuh diri|akhiri hidup|suicide|sayat tangan|mengakhiri hidupku)' then
    v_status := 'crisis_hold';
  end if;

  insert into public.letters (thread_id, sender_id, is_opening, reply_type, template_code, content, moderation_status)
  values (p_thread_id, v_user_id, false, 'community', p_template_code, trim(p_content), v_status)
  returning id into v_letter_id;

  update public.letter_threads set updated_at = now() where id = p_thread_id;

  return jsonb_build_object('ok', true, 'thread_id', p_thread_id, 'letter_id', v_letter_id, 'status', v_status, 'is_crisis_hold', v_status = 'crisis_hold');
end;
$$;

create or replace function public.send_opening_letter(
  p_topic text,
  p_title text,
  p_content text,
  p_template_code text default 'vintage_parchment'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_quota jsonb;
  v_template public.letter_templates%rowtype;
  v_thread_id uuid;
  v_letter_id uuid;
  v_status text := 'pending';
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sesi login tidak valid.');
  end if;
  if p_content is null or length(trim(p_content)) < 10 then
    return jsonb_build_object('ok', false, 'message', 'Isi surat batin minimal 10 karakter.');
  end if;

  perform 1 from public.member_profiles where id = v_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Profil member tidak ditemukan.');
  end if;

  v_quota := public.get_member_letter_quota(v_user_id);
  if not (v_quota->>'can_send')::boolean then
    return jsonb_build_object('ok', false, 'message', 'Kuota surat pembuka bulan ini telah habis (' || (v_quota->>'limit') || ' surat). Lihat paket yang tersedia di halaman akun.');
  end if;

  select * into v_template from public.letter_templates where code = p_template_code and is_active = true;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Tema surat tidak tersedia.');
  end if;
  if v_template.tier_required = 'premium' and (v_quota->>'tier') <> 'premium' then
    return jsonb_build_object('ok', false, 'message', 'Tema kertas ini eksklusif untuk Member Premium.');
  end if;
  if p_content ~* '(bunuh diri|akhiri hidup|suicide|sayat tangan|mengakhiri hidupku)' then
    v_status := 'crisis_hold';
  end if;

  insert into public.letter_threads (author_id, topic, status)
  values (v_user_id, coalesce(nullif(trim(p_topic), ''), 'Luapan Hati'), 'open')
  returning id into v_thread_id;

  insert into public.letters (
    thread_id, sender_id, is_opening, reply_type, template_code, title, content, moderation_status
  ) values (
    v_thread_id, v_user_id, true, 'community', p_template_code, nullif(trim(p_title), ''), trim(p_content), v_status
  ) returning id into v_letter_id;

  return jsonb_build_object(
    'ok', true, 'thread_id', v_thread_id, 'letter_id', v_letter_id,
    'status', v_status, 'is_crisis_hold', v_status = 'crisis_hold'
  );
end;
$$;
revoke execute on function public.get_member_letter_quota(uuid) from public, anon;
grant execute on function public.get_member_letter_quota(uuid) to authenticated, service_role;
revoke all on function public.send_special_letter(text, text, text, text) from public, anon;
grant execute on function public.send_special_letter(text, text, text, text) to authenticated, service_role;
