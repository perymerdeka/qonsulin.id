-- Sprint 1: Member Profiles & Auth Setup

create table if not exists public.member_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  alias text not null unique,
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  tier text not null default 'free' check (tier in ('free', 'premium')),
  avatar_config jsonb not null default '{
    "mood": "smile",
    "glasses": false,
    "bg": "sky"
  }'::jsonb,
  bio text,
  accepted_terms_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger updated_at
drop trigger if exists touch_member_profiles_updated_at on public.member_profiles;
create trigger touch_member_profiles_updated_at
  before update on public.member_profiles
  for each row execute function public.touch_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_alias text;
  unique_alias text;
  idx int := 1;
begin
  candidate_alias := coalesce(
    nullif(trim(new.raw_user_meta_data->>'alias'), ''),
    nullif(trim(split_part(new.email, '@', 1)), ''),
    'Teman'
  );
  candidate_alias := regexp_replace(candidate_alias, '[^a-zA-Z0-9_\- ]', '', 'g');
  if length(candidate_alias) < 3 then
    candidate_alias := 'Teman_' || substr(new.id::text, 1, 6);
  end if;

  unique_alias := candidate_alias;
  while exists (select 1 from public.member_profiles where alias = unique_alias) loop
    idx := idx + 1;
    unique_alias := candidate_alias || '_' || idx;
  end loop;

  insert into public.member_profiles (id, alias, avatar_config, accepted_terms_at)
  values (
    new.id,
    unique_alias,
    coalesce(new.raw_user_meta_data->'avatar_config', '{"mood":"smile","glasses":false,"bg":"sky"}'::jsonb),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function public.handle_new_member();

-- RLS
alter table public.member_profiles enable row level security;

-- 1. Member can read own profile
drop policy if exists "Members can read own profile" on public.member_profiles;
create policy "Members can read own profile"
  on public.member_profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- 2. Public can read alias & avatar only (for letters & community pool)
drop policy if exists "Public can read member alias and avatar" on public.member_profiles;
create policy "Public can read member alias and avatar"
  on public.member_profiles
  for select
  using (true);

-- 3. Member can update own profile (alias, avatar, bio)
drop policy if exists "Members can update own profile" on public.member_profiles;
create policy "Members can update own profile"
  on public.member_profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Prevents members from escalating their own role or tier directly
    and role = (select p.role from public.member_profiles p where p.id = auth.uid())
    and tier = (select p.tier from public.member_profiles p where p.id = auth.uid())
  );
