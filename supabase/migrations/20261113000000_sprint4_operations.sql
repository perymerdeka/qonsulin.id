-- Sprint 4: private special-letter intake and admin-led disposition.
-- Special letters remain in the existing letter/thread domain; no WhatsApp handoff or staff-login model is introduced here.

-- A thread is either public (Letter Pool) or private (admin-led special delivery).
alter table public.letter_threads
  add column if not exists delivery_mode text not null default 'public',
  add column if not exists special_destination text,
  add column if not exists handling_status text,
  add column if not exists assigned_companion_id uuid references public.companions(id) on delete set null,
  add column if not exists assigned_at timestamptz;

alter table public.letter_threads drop constraint if exists letter_threads_delivery_mode_check;
alter table public.letter_threads add constraint letter_threads_delivery_mode_check
  check (delivery_mode in ('public', 'special'));
alter table public.letter_threads drop constraint if exists letter_threads_special_destination_check;
alter table public.letter_threads add constraint letter_threads_special_destination_check
  check (special_destination is null or special_destination in ('mentor', 'counselor'));
alter table public.letter_threads drop constraint if exists letter_threads_handling_status_check;
alter table public.letter_threads add constraint letter_threads_handling_status_check
  check (handling_status is null or handling_status in ('waiting', 'assigned', 'in_progress', 'completed', 'needs_attention'));
alter table public.letters alter column sender_id drop not null;
alter table public.letters add column if not exists operator_reply boolean not null default false;
alter table public.letters drop constraint if exists letters_operator_reply_sender_check;
alter table public.letters add constraint letters_operator_reply_sender_check
  check ((operator_reply and sender_id is null and not is_opening) or (not operator_reply and sender_id is not null));

create index if not exists letter_threads_special_queue_idx
  on public.letter_threads (handling_status, created_at desc)
  where delivery_mode = 'special';

-- Special delivery is unlocked only by its active consultation package.
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
  v_tier text;
  v_required_package text;
  v_template public.letter_templates%rowtype;
  v_thread_id uuid;
  v_letter_id uuid;
  v_handling_status text := 'waiting';
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sesi login tidak valid.');
  end if;
  if p_destination is null or p_destination not in ('mentor', 'counselor') then
    return jsonb_build_object('ok', false, 'message', 'Tujuan surat khusus tidak valid.');
  end if;
  if p_content is null or char_length(trim(p_content)) < 10 then
    return jsonb_build_object('ok', false, 'message', 'Isi surat minimal 10 karakter.');
  end if;
  if char_length(trim(p_content)) > 3000 or char_length(coalesce(p_title, '')) > 80 then
    return jsonb_build_object('ok', false, 'message', 'Isi surat maksimal 3000 karakter dan judul maksimal 80 karakter.');
  end if;

  v_required_package := case when p_destination = 'mentor' then 'konseling_sebaya' else 'psikolog_klinis' end;
  if not exists (
    select 1
    from public.package_orders
    where user_id = v_user_id
      and package_code = v_required_package
      and status = 'active'
      and (expires_at is null or expires_at > now())
  ) then
    return jsonb_build_object(
      'ok', false,
      'message', case when p_destination = 'mentor'
        then 'Surat untuk mentor tersedia setelah paket Konseling Teman Dengar aktif.'
        else 'Surat untuk konselor tersedia setelah paket Konseling Psikolog aktif.'
      end
    );
  end if;

  select tier into v_tier from public.member_profiles where id = v_user_id;
  select * into v_template from public.letter_templates where code = p_template_code and is_active = true;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Tema surat tidak tersedia.');
  end if;
  if v_template.tier_required = 'premium' and coalesce(v_tier, 'free') <> 'premium' then
    return jsonb_build_object('ok', false, 'message', 'Tema kertas ini eksklusif untuk Member Premium.');
  end if;
  if p_content ~* '(bunuh diri|akhiri hidup|suicide|sayat tangan|mengakhiri hidupku)' then
    v_handling_status := 'needs_attention';
  end if;

  insert into public.letter_threads (author_id, topic, status, delivery_mode, special_destination, handling_status)
  values (
    v_user_id,
    case when p_destination = 'mentor' then 'Surat untuk Mentor' else 'Surat untuk Konselor' end,
    'open',
    'special',
    p_destination,
    v_handling_status
  )
  returning id into v_thread_id;

  -- An approved private letter never enters the public pool because pool policies also require delivery_mode = 'public'.
  insert into public.letters (
    thread_id, sender_id, is_opening, reply_type, template_code, title, content, moderation_status
  ) values (
    v_thread_id, v_user_id, true, 'community', p_template_code, nullif(trim(p_title), ''), trim(p_content), 'approved'
  )
  returning id into v_letter_id;

  return jsonb_build_object(
    'ok', true,
    'thread_id', v_thread_id,
    'letter_id', v_letter_id,
    'handling_status', v_handling_status,
    'is_crisis_hold', v_handling_status = 'needs_attention'
  );
end;
$$;

revoke all on function public.send_special_letter(text, text, text, text) from public, anon;
grant execute on function public.send_special_letter(text, text, text, text) to authenticated, service_role;

create or replace function public.is_public_letter_thread(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.letter_threads thread
    where thread.id = p_thread_id and thread.delivery_mode = 'public'
  );
$$;
revoke all on function public.is_public_letter_thread(uuid) from public;
grant execute on function public.is_public_letter_thread(uuid) to anon, authenticated, service_role;

-- Public pool access must never include a private special-delivery opening letter.
drop policy if exists "Read threads with approved letters" on public.letter_threads;
drop policy if exists "Read public threads with approved opening letters" on public.letter_threads;
create policy "Read public threads with approved opening letters"
  on public.letter_threads for select
  using (
    (
      delivery_mode = 'public'
      and exists (
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

drop policy if exists "Read approved opening letters for pool" on public.letters;
drop policy if exists "Read approved public opening letters for pool" on public.letters;
create policy "Read approved public opening letters for pool"
  on public.letters for select
  using (
    is_opening = true
    and moderation_status = 'approved'
    and is_hidden = false
    and public.is_public_letter_thread(thread_id)
  );

-- Public replies are disabled for private special-delivery threads. Admin posts a real letter as operator.
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

  return jsonb_build_object('ok', true, 'thread_id', p_thread_id, 'letter_id', v_letter_id, 'status', v_status, 'is_crisis_hold', v_status = 'crisis_hold');
end;
$$;

-- Only the server service role may assign and publish a private reply.
create or replace function public.admin_handle_special_letter(
  p_thread_id uuid,
  p_status text,
  p_companion_id uuid default null,
  p_response text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread public.letter_threads%rowtype;
  v_template_code text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Akses ditolak';
  end if;
  if p_status is null or p_status not in ('waiting', 'assigned', 'in_progress', 'completed', 'needs_attention') then
    return jsonb_build_object('ok', false, 'message', 'Status penanganan tidak valid.');
  end if;
  if p_response is not null and (char_length(trim(p_response)) < 10 or char_length(trim(p_response)) > 3000) then
    return jsonb_build_object('ok', false, 'message', 'Balasan harus 10-3000 karakter.');
  end if;

  select * into v_thread from public.letter_threads
  where id = p_thread_id and delivery_mode = 'special'
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Surat privat tidak ditemukan.');
  end if;
  if p_companion_id is not null and not exists (select 1 from public.companions where id = p_companion_id) then
    return jsonb_build_object('ok', false, 'message', 'Profil pendamping tidak ditemukan.');
  end if;
  if p_response is not null then
    select template_code into v_template_code from public.letters
    where thread_id = p_thread_id and is_opening = true
    limit 1;
    insert into public.letters (thread_id, sender_id, is_opening, operator_reply, reply_type, template_code, content, moderation_status)
    values (p_thread_id, null, false, true, 'community', coalesce(v_template_code, 'vintage_parchment'), trim(p_response), 'approved');
  end if;
  update public.letter_threads
  set handling_status = p_status,
      assigned_companion_id = p_companion_id,
      assigned_at = case when p_companion_id is null then null when assigned_companion_id is distinct from p_companion_id then now() else assigned_at end
  where id = p_thread_id;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.admin_handle_special_letter(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_handle_special_letter(uuid, text, uuid, text) to service_role;
