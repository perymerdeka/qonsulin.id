-- Catalog settings, the member dashboard, and RPC quota checks must agree.
-- Paid-order snapshots still preserve the price and duration at checkout.
create or replace function public.record_membership_policy_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.category = 'membership' and new.membership_tier is not null and (
    tg_op = 'INSERT' or
    (old.letter_quota, old.screening_quota, old.membership_tier)
      is distinct from (new.letter_quota, new.screening_quota, new.membership_tier)
  ) then
    -- Prevent an old, scheduled Free policy from superseding a newer change.
    delete from public.membership_policy_versions
    where package_id = new.id and effective_at > now();

    insert into public.membership_policy_versions (
      package_id,
      tier,
      letter_quota,
      screening_quota,
      effective_at
    ) values (
      new.id,
      new.membership_tier,
      coalesce(new.letter_quota, case when new.membership_tier = 'free' then 3 else -1 end),
      coalesce(new.screening_quota, 1),
      now()
    );
  end if;

  return new;
end;
$$;

-- Make the current package configuration the active policy now, and remove
-- previously implicit future policies that have no scheduling UI behind them.
delete from public.membership_policy_versions policy
using public.consultation_packages package
where policy.package_id = package.id
  and package.category = 'membership'
  and policy.effective_at > now();

insert into public.membership_policy_versions (
  package_id,
  tier,
  letter_quota,
  screening_quota,
  effective_at
)
select
  package.id,
  package.membership_tier,
  coalesce(package.letter_quota, case when package.membership_tier = 'free' then 3 else -1 end),
  coalesce(package.screening_quota, 1),
  now()
from public.consultation_packages package
where package.category = 'membership'
  and package.membership_tier is not null;

notify pgrst, 'reload schema';
