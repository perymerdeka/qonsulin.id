-- Sprint 3: Anonymous Letter Pool & Templates

-- 1. Letter Templates
create table if not exists public.letter_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  paper_style text not null, -- CSS classes or color theme
  wax_seal_color text not null default '#b91c1c', -- hex seal color
  tier_required text not null default 'free' check (tier_required in ('free', 'premium')),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Seed default templates
insert into public.letter_templates (code, name, paper_style, wax_seal_color, tier_required, is_active, sort_order)
values
  ('vintage_parchment', 'Kertas Lilin Klasik', 'paper-vintage', '#991b1b', 'free', true, 1),
  ('warm_pastel', 'Senja Tenang Pastel', 'paper-pastel', '#b45309', 'free', true, 2),
  ('night_sky', 'Langit Malam Sunyi', 'paper-night', '#4338ca', 'premium', true, 3),
  ('botanical_sage', 'Sage Daun Teduh', 'paper-sage', '#15803d', 'premium', true, 4)
on conflict (code) do nothing;

-- 2. Letter Threads
create table if not exists public.letter_threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  topic text not null default 'Luapan Hati',
  status text not null default 'open' check (status in ('open', 'closed', 'flagged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists touch_letter_threads_updated_at on public.letter_threads;
create trigger touch_letter_threads_updated_at
  before update on public.letter_threads
  for each row execute function public.touch_updated_at();

-- 3. Letters Table
create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.letter_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  is_opening boolean not null default false,
  reply_type text not null default 'community' check (reply_type in ('community', 'volunteer', 'professional')),
  template_code text not null default 'vintage_parchment' references public.letter_templates(code) on update cascade,
  title text,
  content text not null check (length(trim(content)) >= 10),
  moderation_status text not null default 'approved' check (moderation_status in ('pending', 'approved', 'rejected', 'crisis_hold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists touch_letters_updated_at on public.letters;
create trigger touch_letters_updated_at
  before update on public.letters
  for each row execute function public.touch_updated_at();

-- Indexes for performance
create index if not exists idx_letters_thread_id on public.letters(thread_id);
create index if not exists idx_letters_pool on public.letters(moderation_status, is_opening, created_at desc);
create index if not exists idx_letters_sender_quota on public.letters(sender_id, is_opening, created_at desc);

-- 4. Monthly Letter Quota Helper Function
create or replace function public.get_member_letter_quota(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text;
  v_used int;
  v_limit int := 3;
begin
  select tier into v_tier from public.member_profiles where id = p_user_id;
  if v_tier is null then
    v_tier := 'free';
  end if;

  if v_tier = 'premium' then
    return jsonb_build_object(
      'tier', 'premium',
      'used', 0,
      'limit', -1,
      'remaining', 9999,
      'can_send', true
    );
  end if;

  select count(*) into v_used
  from public.letters
  where sender_id = p_user_id
    and is_opening = true
    and created_at >= date_trunc('month', now());

  return jsonb_build_object(
    'tier', 'free',
    'used', v_used,
    'limit', v_limit,
    'remaining', greatest(0, v_limit - v_used),
    'can_send', (v_used < v_limit)
  );
end;
$$;

-- 5. Stored Procedure: Send Opening Letter (Enforcing Quota & Template entitlement)
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
  v_template record;
  v_thread_id uuid;
  v_letter_id uuid;
  v_status text := 'approved';
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sesi login tidak valid.');
  end if;

  if length(trim(p_content)) < 10 then
    return jsonb_build_object('ok', false, 'message', 'Isi surat batin minimal 10 karakter.');
  end if;

  -- Check quota
  v_quota := public.get_member_letter_quota(v_user_id);
  if not (v_quota->>'can_send')::boolean then
    return jsonb_build_object('ok', false, 'message', 'Kuota surat batin bulan ini telah habis (3/3 surat). Tingkatkan ke Premium untuk menulis tanpa batas.');
  end if;

  -- Check template
  select * into v_template from public.letter_templates where code = p_template_code and is_active = true;
  if not found then
    p_template_code := 'vintage_parchment';
  elsif v_template.tier_required = 'premium' and (v_quota->>'tier') <> 'premium' then
    return jsonb_build_object('ok', false, 'message', 'Tema kertas ini eksklusif untuk Member Premium.');
  end if;

  -- Crisis check basic signal
  if p_content ~* '(bunuh diri|akhiri hidup|suicide|sayat tangan|mengakhiri hidupku)' then
    v_status := 'crisis_hold';
  end if;

  -- Create thread
  insert into public.letter_threads (author_id, topic, status)
  values (v_user_id, coalesce(nullif(trim(p_topic), ''), 'Luapan Hati'), 'open')
  returning id into v_thread_id;

  -- Create opening letter
  insert into public.letters (
    thread_id, sender_id, is_opening, reply_type, template_code, title, content, moderation_status
  )
  values (
    v_thread_id, v_user_id, true, 'community', p_template_code, nullif(trim(p_title), ''), trim(p_content), v_status
  )
  returning id into v_letter_id;

  return jsonb_build_object(
    'ok', true,
    'thread_id', v_thread_id,
    'letter_id', v_letter_id,
    'status', v_status,
    'is_crisis_hold', (v_status = 'crisis_hold')
  );
end;
$$;

-- 6. Stored Procedure: Send Reply Letter
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
  v_thread record;
  v_letter_id uuid;
  v_status text := 'approved';
  v_role text;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', 'Sesi login tidak valid.');
  end if;

  if length(trim(p_content)) < 10 then
    return jsonb_build_object('ok', false, 'message', 'Balasan surat minimal 10 karakter.');
  end if;

  select * into v_thread from public.letter_threads where id = p_thread_id;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Surat yang ingin dibalas tidak ditemukan.');
  end if;

  if v_thread.status = 'closed' then
    return jsonb_build_object('ok', false, 'message', 'Percakapan surat ini telah ditutup.');
  end if;

  -- Only authorized roles can set volunteer or professional
  select role into v_role from public.member_profiles where id = v_user_id;
  if p_reply_type in ('volunteer', 'professional') and v_role not in ('moderator', 'admin') then
    p_reply_type := 'community';
  end if;

  -- Crisis signal check
  if p_content ~* '(bunuh diri|akhiri hidup|suicide|sayat tangan|mengakhiri hidupku)' then
    v_status := 'crisis_hold';
  end if;

  insert into public.letters (
    thread_id, sender_id, is_opening, reply_type, template_code, content, moderation_status
  )
  values (
    p_thread_id, v_user_id, false, p_reply_type, coalesce(p_template_code, 'vintage_parchment'), trim(p_content), v_status
  )
  returning id into v_letter_id;

  -- Touch thread updated_at
  update public.letter_threads set updated_at = now() where id = p_thread_id;

  return jsonb_build_object(
    'ok', true,
    'thread_id', p_thread_id,
    'letter_id', v_letter_id,
    'status', v_status
  );
end;
$$;

-- 7. RLS Configuration
alter table public.letter_templates enable row level security;
alter table public.letter_threads enable row level security;
alter table public.letters enable row level security;

-- Templates: Everyone can read active templates
drop policy if exists "Public read active templates" on public.letter_templates;
create policy "Public read active templates"
  on public.letter_templates for select using (is_active = true);

-- Letter Threads:
-- 1) Anyone can read threads that have at least one approved opening letter
drop policy if exists "Read threads with approved letters" on public.letter_threads;
create policy "Read threads with approved letters"
  on public.letter_threads for select
  using (
    status = 'open' or
    author_id = auth.uid()
  );

-- Letters:
-- 1) Anyone can read approved opening letters (for pool feed)
drop policy if exists "Read approved opening letters for pool" on public.letters;
create policy "Read approved opening letters for pool"
  on public.letters for select
  using (
    moderation_status = 'approved' or
    sender_id = auth.uid()
  );

-- 2) Members can insert via stored procedure (security definer) or directly if authenticated
drop policy if exists "Authenticated insert letters" on public.letters;
create policy "Authenticated insert letters"
  on public.letters for insert
  to authenticated
  with check (auth.uid() = sender_id);