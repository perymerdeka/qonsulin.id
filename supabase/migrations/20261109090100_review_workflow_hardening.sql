drop policy if exists "Authenticated insert letters" on public.letters;

create or replace function public.get_member_letter_quota(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text;
  v_used int;
begin
  if auth.uid() is distinct from p_user_id and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Tidak berwenang membaca kuota pengguna lain.';
  end if;
  select tier into v_tier from public.member_profiles where id = p_user_id;
  v_tier := coalesce(v_tier, 'free');
  if v_tier = 'premium' then
    return jsonb_build_object('tier', 'premium', 'used', 0, 'limit', -1, 'remaining', 9999, 'can_send', true);
  end if;

  select count(*) into v_used from public.letters
  where sender_id = p_user_id and is_opening = true
    and created_at >= date_trunc('month', now());
  return jsonb_build_object('tier', 'free', 'used', v_used, 'limit', 3,
    'remaining', greatest(0, 3 - v_used), 'can_send', v_used < 3);
end;
$$;

revoke execute on function public.get_member_letter_quota(uuid) from public, anon;
grant execute on function public.get_member_letter_quota(uuid) to authenticated, service_role;

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
  set status = 'active', activated_at = now(),
      expires_at = case when pkg.duration_days is not null then now() + (pkg.duration_days || ' days')::interval else null end
  where id = target_order_id;

  if pkg.category = 'membership' and ord.package_code = 'member_premium' then
    update public.member_profiles set tier = 'premium' where id = ord.user_id;
  end if;
  return jsonb_build_object('ok', true, 'message', 'Pesanan telah diverifikasi dan diaktifkan.');
end;
$$;

revoke execute on function public.activate_package_order(uuid) from public, anon, authenticated;
grant execute on function public.activate_package_order(uuid) to service_role;
