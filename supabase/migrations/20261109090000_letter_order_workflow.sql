-- Make the manual payment and anonymous-letter review workflows explicit.

-- Orders can only be created through the validated RPC below.
drop policy if exists "Anyone can insert orders" on public.package_orders;
revoke execute on function public.activate_package_order(uuid) from public, anon, authenticated;
grant execute on function public.activate_package_order(uuid) to service_role;

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

  select * into v_package
  from public.consultation_packages
  where code = p_package_code and is_active = true;
  if not found or v_package.price <= 0 then
    return jsonb_build_object('ok', false, 'message', 'Paket tidak tersedia untuk dipesan.');
  end if;

  select alias into v_alias from public.member_profiles where id = v_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Profil member tidak ditemukan.');
  end if;
  select id into v_order_id
  from public.package_orders
  where user_id = v_user_id
    and package_id = v_package.id
    and status = 'pending'
    and created_at >= now() - interval '24 hours'
  order by created_at desc
  limit 1;

  if v_order_id is null then
    insert into public.package_orders (
      user_id, package_id, package_code, package_name, amount, status, buyer_name
    ) values (
      v_user_id, v_package.id, v_package.code, v_package.name, v_package.price, 'pending', v_alias
    ) returning id into v_order_id;
  end if;

  return jsonb_build_object('ok', true, 'order_id', v_order_id, 'status', 'pending');
end;
$$;

revoke execute on function public.create_package_order(text) from public, anon;
grant execute on function public.create_package_order(text) to authenticated, service_role;

-- Every community letter must be reviewed before it is visible to other members.
alter table public.letters alter column moderation_status set default 'pending';
alter table public.letters add column if not exists reviewed_at timestamptz;
alter table public.letters add column if not exists review_note text;

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
  if not found then return jsonb_build_object('ok', false, 'message', 'Profil member tidak ditemukan.'); end if;
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

  return jsonb_build_object('ok', true, 'thread_id', v_thread_id, 'letter_id', v_letter_id, 'status', v_status, 'is_crisis_hold', v_status = 'crisis_hold');
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
  v_template public.letter_templates%rowtype;
  v_letter_id uuid;
  v_status text := 'pending';
begin
  if v_user_id is null then return jsonb_build_object('ok', false, 'message', 'Sesi login tidak valid.'); end if;
  if p_content is null or length(trim(p_content)) < 10 then return jsonb_build_object('ok', false, 'message', 'Balasan surat minimal 10 karakter.'); end if;
  if not exists (
    select 1
    from public.letter_threads thread
    join public.letters opening on opening.thread_id = thread.id and opening.is_opening = true
    where thread.id = p_thread_id and thread.status = 'open' and opening.moderation_status = 'approved'
  ) then return jsonb_build_object('ok', false, 'message', 'Surat belum tersedia untuk dibalas.'); end if;

  select tier into v_tier from public.member_profiles where id = v_user_id;
  select * into v_template from public.letter_templates where code = p_template_code and is_active = true;
  if not found then return jsonb_build_object('ok', false, 'message', 'Tema surat tidak tersedia.'); end if;
  if v_template.tier_required = 'premium' and coalesce(v_tier, 'free') <> 'premium' then
    return jsonb_build_object('ok', false, 'message', 'Tema kertas ini eksklusif untuk Member Premium.');
  end if;
  if p_reply_type <> 'community' then
    return jsonb_build_object('ok', false, 'message', 'Label relawan dan profesional hanya diberikan oleh admin yang berwenang.');
  end if;
  if p_content ~* '(bunuh diri|akhiri hidup|suicide|sayat tangan|mengakhiri hidupku)' then v_status := 'crisis_hold'; end if;

  insert into public.letters (thread_id, sender_id, is_opening, reply_type, template_code, content, moderation_status)
  values (p_thread_id, v_user_id, false, 'community', p_template_code, trim(p_content), v_status)
  returning id into v_letter_id;
  update public.letter_threads set updated_at = now() where id = p_thread_id;
  return jsonb_build_object('ok', true, 'thread_id', p_thread_id, 'letter_id', v_letter_id, 'status', v_status);
end;
$$;
