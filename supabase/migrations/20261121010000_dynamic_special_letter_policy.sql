-- Membership quota policy is dynamic for active members. Order snapshots remain as
-- an audit record of the purchased price and duration, not the live quota source.
create or replace function public.get_member_letter_quota(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text := 'free';
  v_letter_limit int := 3;
  v_special_letter_limit int := 1;
  v_letter_used int := 0;
  v_special_letter_used int := 0;
  v_has_open_special_letter boolean := false;
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

  if exists (
    select 1
    from public.package_orders orders
    join public.consultation_packages package on package.id = orders.package_id
    where orders.user_id = p_user_id
      and orders.status = 'active'
      and package.category = 'membership'
      and package.membership_tier = 'premium'
      and (orders.expires_at is null or orders.expires_at > now())
  ) then
    v_tier := 'premium';
  end if;

  select policy.letter_quota, policy.screening_quota
  into v_letter_limit, v_special_letter_limit
  from public.membership_policy_versions policy
  where policy.tier = v_tier and policy.effective_at <= now()
  order by policy.effective_at desc, policy.id desc
  limit 1;

  if not found then
    select coalesce(package.letter_quota, case when v_tier = 'free' then 3 else -1 end),
           coalesce(package.screening_quota, 1)
    into v_letter_limit, v_special_letter_limit
    from public.consultation_packages package
    where package.category = 'membership'
      and package.membership_tier = v_tier
      and package.is_active = true
    order by package.sort_order asc
    limit 1;
  end if;

  v_letter_limit := coalesce(v_letter_limit, case when v_tier = 'free' then 3 else -1 end);
  v_special_letter_limit := coalesce(v_special_letter_limit, 1);

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

  select count(*) into v_special_letter_used
  from public.letter_threads
  where author_id = p_user_id
    and delivery_mode = 'special'
    and created_at >= v_month_start;

  select exists (
    select 1
    from public.letter_threads
    where author_id = p_user_id
      and delivery_mode = 'special'
      and handling_status in ('waiting', 'assigned', 'in_progress', 'needs_attention')
  ) into v_has_open_special_letter;

  return jsonb_build_object(
    'tier', v_tier,
    'used', v_letter_used,
    'limit', v_letter_limit,
    'remaining', case when v_letter_limit = -1 then -1 else greatest(0, v_letter_limit - v_letter_used) end,
    'can_send', v_letter_limit = -1 or v_letter_used < v_letter_limit,
    'special_letter_used', v_special_letter_used,
    'special_letter_limit', v_special_letter_limit,
    'special_letter_remaining', case when v_special_letter_limit = -1 then -1 else greatest(0, v_special_letter_limit - v_special_letter_used) end,
    'can_send_special_letter', (v_special_letter_limit = -1 or v_special_letter_used < v_special_letter_limit) and not v_has_open_special_letter,
    'has_open_special_letter', v_has_open_special_letter,
    -- Backward-compatible aliases for deployed clients during rollout.
    'screening_used', v_special_letter_used,
    'screening_limit', v_special_letter_limit,
    'screening_remaining', case when v_special_letter_limit = -1 then -1 else greatest(0, v_special_letter_limit - v_special_letter_used) end,
    'can_request_screening', (v_special_letter_limit = -1 or v_special_letter_used < v_special_letter_limit) and not v_has_open_special_letter,
    'has_open_screening', v_has_open_special_letter
  );
end;
$$;

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
  if p_destination is null or p_destination not in ('mentor', 'counselor') then return jsonb_build_object('ok', false, 'message', 'Pilih tujuan surat: mentor atau konselor.'); end if;
  if p_content is null or char_length(trim(p_content)) < 10 then return jsonb_build_object('ok', false, 'message', 'Isi surat minimal 10 karakter.'); end if;
  if char_length(trim(p_content)) > 3000 or char_length(coalesce(p_title, '')) > 80 then return jsonb_build_object('ok', false, 'message', 'Isi surat maksimal 3000 karakter dan judul maksimal 80 karakter.'); end if;

  perform 1 from public.member_profiles where id = v_user_id for update;
  if not found then return jsonb_build_object('ok', false, 'message', 'Profil member tidak ditemukan.'); end if;
  v_entitlement := public.get_member_letter_quota(v_user_id);
  v_tier := coalesce(v_entitlement->>'tier', 'free');

  if not coalesce((v_entitlement->>'can_send_special_letter')::boolean, false) then
    return jsonb_build_object('ok', false, 'message', case when coalesce((v_entitlement->>'has_open_special_letter')::boolean, false)
      then 'Surat khususmu masih diproses. Selesaikan surat sebelumnya sebelum mengirim surat baru.'
      else 'Kuota surat khusus bulan ini telah digunakan.'
    end);
  end if;

  select * into v_template from public.letter_templates where code = p_template_code and is_active = true;
  if not found then return jsonb_build_object('ok', false, 'message', 'Tema surat tidak tersedia.'); end if;
  if v_template.tier_required = 'premium' and v_tier <> 'premium' then return jsonb_build_object('ok', false, 'message', 'Tema kertas ini eksklusif untuk Member Premium.'); end if;
  if p_content ~* '(bunuh diri|akhiri hidup|suicide|sayat tangan|mengakhiri hidupku)' then v_handling_status := 'needs_attention'; end if;

  insert into public.letter_threads (author_id, topic, status, delivery_mode, special_destination, handling_status)
  values (v_user_id, case when p_destination = 'mentor' then 'Surat untuk Mentor' else 'Surat untuk Konselor' end, 'open', 'special', p_destination, v_handling_status)
  returning id into v_thread_id;

  insert into public.letters (thread_id, sender_id, is_opening, reply_type, template_code, title, content, moderation_status)
  values (v_thread_id, v_user_id, true, 'community', p_template_code, nullif(trim(p_title), ''), trim(p_content), 'approved')
  returning id into v_letter_id;

  return jsonb_build_object('ok', true, 'thread_id', v_thread_id, 'letter_id', v_letter_id, 'handling_status', v_handling_status, 'is_crisis_hold', v_handling_status = 'needs_attention');
end;
$$;
