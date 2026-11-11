-- Sprint 3 P0: privacy thread (inbox/outbox), report/block/close, RLS matrix, state surat.
-- Semua objek dibuat idempotent agar aman dijalankan ulang pada staging.

-- ============================================================
-- 1. Skema pendukung
-- ============================================================
alter table public.letter_threads
  add column if not exists blocked_by uuid references public.member_profiles(id) on delete set null;

alter table public.letter_threads drop constraint if exists letter_threads_status_check;
alter table public.letter_threads add constraint letter_threads_status_check
  check (status in ('open', 'closed', 'blocked', 'flagged'));

alter table public.letters
  add column if not exists is_hidden boolean not null default false;

create table if not exists public.letter_reports (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.letter_threads(id) on delete cascade,
  reporter_id uuid not null references public.member_profiles(id) on delete cascade,
  reason text not null,
  detail text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.member_profiles(id) on delete set null,
  unique (thread_id, reporter_id)
);

create index if not exists letter_reports_status_idx on public.letter_reports (status, created_at desc);

-- ============================================================
-- 2. Helper: peserta thread
-- ============================================================
create or replace function public.is_letter_participant(p_thread_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.letters letter
    where letter.thread_id = p_thread_id
      and letter.sender_id = p_user_id
      and letter.moderation_status <> 'rejected'
  );
$$;

create or replace function public.is_moderator(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.member_profiles profile
    where profile.id = p_user_id and profile.role in ('moderator', 'admin')
  );
$$;

grant execute on function public.is_letter_participant(uuid, uuid) to public, anon, authenticated;
grant execute on function public.is_moderator(uuid) to public, anon, authenticated;

-- ============================================================
-- 3. RPC submit / reply / report / block / close
-- ============================================================
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
    return jsonb_build_object('ok', false, 'message', 'Kuota surat batin bulan ini telah habis (3/3 surat). Tingkatkan ke Premium untuk menulis tanpa batas.');
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

  -- Penulis surat pembuka tidak boleh membalas suratnya sendiri.
  if exists (
    select 1 from public.letters opening
    where opening.thread_id = p_thread_id
      and opening.is_opening = true
      and opening.sender_id = v_user_id
  ) then
    return jsonb_build_object('ok', false, 'message', 'Kamu tidak dapat membalas suratmu sendiri. Tunggu balasan dari kawan cerita.');
  end if;

  select tier into v_tier from public.member_profiles where id = v_user_id;
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

  return jsonb_build_object(
    'ok', true, 'thread_id', p_thread_id, 'letter_id', v_letter_id,
    'status', v_status, 'is_crisis_hold', v_status = 'crisis_hold'
  );
end;
$$;

create or replace function public.report_letter_thread(
  p_thread_id uuid,
  p_reason text,
  p_detail text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_report_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sesi login tidak valid.');
  end if;
  if p_reason is null or length(trim(p_reason)) < 3 then
    return jsonb_build_object('ok', false, 'message', 'Tuliskan alasan pelaporan yang valid.');
  end if;
  if not exists (select 1 from public.letter_threads where id = p_thread_id) then
    return jsonb_build_object('ok', false, 'message', 'Thread tidak ditemukan.');
  end if;
  -- Siapa pun yang login dan dapat melihat thread approved boleh melapor (safety),
  -- tetapi block/close tetap khusus peserta.
  if not public.is_letter_participant(p_thread_id, v_user_id)
     and not exists (
       select 1 from public.letters opening
       where opening.thread_id = p_thread_id
         and opening.is_opening = true
         and opening.moderation_status = 'approved'
         and opening.is_hidden = false
     ) then
    return jsonb_build_object('ok', false, 'message', 'Thread ini tidak tersedia untuk dilaporkan.');
  end if;

  insert into public.letter_reports (thread_id, reporter_id, reason, detail)
  values (p_thread_id, v_user_id, trim(p_reason), nullif(trim(coalesce(p_detail, '')), ''))
  on conflict (thread_id, reporter_id) do update
    set reason = excluded.reason,
        detail = excluded.detail,
        status = 'open',
        reviewed_at = null,
        reviewed_by = null
  returning id into v_report_id;

  update public.letter_threads
  set status = case when status = 'open' then 'flagged' else status end,
      updated_at = now()
  where id = p_thread_id;

  return jsonb_build_object('ok', true, 'report_id', v_report_id);
end;
$$;

create or replace function public.block_letter_thread(p_thread_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sesi login tidak valid.');
  end if;

  select status into v_status from public.letter_threads where id = p_thread_id;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Thread tidak ditemukan.');
  end if;
  if v_status = 'blocked' then
    return jsonb_build_object('ok', false, 'message', 'Thread ini sudah diblokir.');
  end if;
  if not public.is_letter_participant(p_thread_id, v_user_id) then
    return jsonb_build_object('ok', false, 'message', 'Hanya pihak terlibat yang dapat memblokir thread ini.');
  end if;

  update public.letter_threads
  set status = 'blocked', blocked_by = v_user_id, updated_at = now()
  where id = p_thread_id;

  update public.letters
  set is_hidden = true
  where thread_id = p_thread_id and moderation_status = 'approved';

  return jsonb_build_object('ok', true, 'thread_id', p_thread_id);
end;
$$;

create or replace function public.close_letter_thread(p_thread_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sesi login tidak valid.');
  end if;

  select status into v_status from public.letter_threads where id = p_thread_id;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Thread tidak ditemukan.');
  end if;
  if v_status = 'closed' then
    return jsonb_build_object('ok', false, 'message', 'Thread ini sudah ditutup.');
  end if;
  if v_status = 'blocked' then
    return jsonb_build_object('ok', false, 'message', 'Thread yang diblokir tidak dapat ditutup.');
  end if;
  if not public.is_letter_participant(p_thread_id, v_user_id) then
    return jsonb_build_object('ok', false, 'message', 'Hanya pihak terlibat yang dapat menutup thread ini.');
  end if;

  update public.letter_threads set status = 'closed', updated_at = now() where id = p_thread_id;
  return jsonb_build_object('ok', true, 'thread_id', p_thread_id);
end;
$$;

revoke execute on function public.send_opening_letter(text, text, text, text) from public, anon;
revoke execute on function public.send_reply_letter(uuid, text, text, text) from public, anon;
revoke execute on function public.report_letter_thread(uuid, text, text) from public, anon;
revoke execute on function public.block_letter_thread(uuid) from public, anon;
revoke execute on function public.close_letter_thread(uuid) from public, anon;

grant execute on function public.send_opening_letter(text, text, text, text) to authenticated, service_role;
grant execute on function public.send_reply_letter(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.report_letter_thread(uuid, text, text) to authenticated, service_role;
grant execute on function public.block_letter_thread(uuid) to authenticated, service_role;
grant execute on function public.close_letter_thread(uuid) to authenticated, service_role;

-- ============================================================
-- 4. RLS access matrix (anon, member A/B, moderator, service role)
-- ============================================================
alter table public.letter_threads enable row level security;
alter table public.letters enable row level security;
alter table public.letter_reports enable row level security;

-- Surat hanya dibuat lewat RPC security definer. Akses tulis langsung ditutup
-- supaya member tidak bisa menyisipkan surat berstatus approved.
drop policy if exists "Authenticated insert letters" on public.letters;
drop policy if exists "Authenticated update letters" on public.letters;

-- letter_threads
drop policy if exists "Read threads with approved letters" on public.letter_threads;
create policy "Read threads with approved letters"
  on public.letter_threads for select
  using (
    (
      exists (
        select 1 from public.letters opening
        where opening.thread_id = letter_threads.id
          and opening.is_opening = true
          and opening.moderation_status = 'approved'
          and opening.is_hidden = false
      )
      and letter_threads.status <> 'blocked'
    )
    or public.is_letter_participant(id)
    or public.is_moderator()
  );

drop policy if exists "Moderators read all threads" on public.letter_threads;
drop policy if exists "Authenticated update threads" on public.letter_threads;

-- letters
drop policy if exists "Read approved opening letters for pool" on public.letters;
create policy "Read approved opening letters for pool"
  on public.letters for select
  using (is_opening = true and moderation_status = 'approved' and is_hidden = false);

drop policy if exists "Participants read thread letters" on public.letters;
create policy "Participants read thread letters"
  on public.letters for select
  using (public.is_letter_participant(thread_id) or sender_id = auth.uid());

drop policy if exists "Moderators read all letters" on public.letters;
create policy "Moderators read all letters"
  on public.letters for select
  to authenticated
  using (public.is_moderator());

-- letter_reports
drop policy if exists "Reporter or moderator read reports" on public.letter_reports;
create policy "Reporter or moderator read reports"
  on public.letter_reports for select
  using (reporter_id = auth.uid() or public.is_moderator());

drop policy if exists "Reporter insert reports" on public.letter_reports;
create policy "Reporter insert reports"
  on public.letter_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());
drop policy if exists "Moderators update reports" on public.letter_reports;
create policy "Moderators update reports"
  on public.letter_reports for update
  to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

-- Moderator perlu menutup/menandai thread saat menangani laporan.
drop policy if exists "Moderators update threads" on public.letter_threads;
create policy "Moderators update threads"
  on public.letter_threads for update
  to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

-- Moderator dapat menyembunyikan surat; isi tidak boleh diubah oleh klien.
drop policy if exists "Moderators update letters" on public.letters;
create policy "Moderators update letters"
  on public.letters for update
  to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());