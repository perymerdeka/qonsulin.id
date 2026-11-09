-- Staging-only data for the member and anonymous-letter workflows.
-- Create the demo Auth users before running this file.

do $$
declare
  v_free_user uuid;
  v_premium_user uuid;
  v_community_user uuid;
  v_moderator_user uuid;
  v_premium_package uuid;
  v_peer_package uuid;
  v_psychologist_package uuid;
  v_thread_id uuid;
begin
  select id into v_free_user from auth.users where email = 'demo.member.free@staging.qonsulin.id';
  select id into v_premium_user from auth.users where email = 'demo.member.premium@staging.qonsulin.id';
  select id into v_community_user from auth.users where email = 'demo.member.community@staging.qonsulin.id';
  select id into v_moderator_user from auth.users where email = 'demo.member.moderator@staging.qonsulin.id';

  if v_free_user is null or v_premium_user is null or v_community_user is null or v_moderator_user is null then
    raise exception 'Demo Auth users are missing. Create them before running supabase/seed.sql.';
  end if;

  select id into v_premium_package from public.consultation_packages where code = 'member_premium';
  select id into v_peer_package from public.consultation_packages where code = 'konseling_sebaya';
  select id into v_psychologist_package from public.consultation_packages where code = 'psikolog_klinis';
  if v_premium_package is null or v_peer_package is null or v_psychologist_package is null then
    raise exception 'Default consultation packages are missing.';
  end if;

  -- Remove only prior synthetic data, never real staging or production content.
  delete from public.package_orders
  where user_id in (v_free_user, v_premium_user, v_community_user, v_moderator_user);
  delete from public.letter_threads
  where author_id in (v_free_user, v_premium_user, v_community_user, v_moderator_user);

  insert into public.member_profiles (id, alias, role, tier, avatar_config, bio, accepted_terms_at)
  values
    (v_free_user, 'Demo_Free_Staging', 'member', 'free', '{"mood":"smile","glasses":false,"bg":"sky"}'::jsonb, 'Akun demo member gratis untuk staging.', now()),
    (v_premium_user, 'Demo_Premium_Staging', 'member', 'premium', '{"mood":"smile","glasses":true,"bg":"sunset"}'::jsonb, 'Akun demo member premium untuk staging.', now()),
    (v_community_user, 'Demo_Community_Staging', 'member', 'free', '{"mood":"smile","glasses":false,"bg":"sage"}'::jsonb, 'Akun demo untuk membalas surat komunitas.', now()),
    (v_moderator_user, 'Demo_Moderator_Staging', 'moderator', 'premium', '{"mood":"smile","glasses":true,"bg":"night"}'::jsonb, 'Akun demo moderator untuk staging.', now())
  on conflict (id) do update set
    alias = excluded.alias,
    role = excluded.role,
    tier = excluded.tier,
    avatar_config = excluded.avatar_config,
    bio = excluded.bio,
    accepted_terms_at = excluded.accepted_terms_at,
    updated_at = now();

  insert into public.package_orders (
    user_id, package_id, package_code, package_name, amount, status, buyer_name, buyer_contact, notes, activated_at, expires_at, created_at
  )
  values
    (v_premium_user, v_premium_package, 'member_premium', 'Member Premium', 19000, 'active', 'Demo Premium Staging', 'demo.member.premium@staging.qonsulin.id', 'Data dummy: pembayaran sudah diverifikasi.', now() - interval '3 days', now() + interval '27 days', now() - interval '3 days'),
    (v_free_user, v_peer_package, 'konseling_sebaya', 'Konseling Teman Dengar (Sebaya)', 35000, 'pending', 'Demo Free Staging', 'demo.member.free@staging.qonsulin.id', 'Data dummy: menunggu verifikasi manual.', null, null, now() - interval '2 hours'),
    (v_community_user, v_psychologist_package, 'psikolog_klinis', 'Konseling Psikolog Klinis', 129000, 'rejected', 'Demo Community Staging', 'demo.member.community@staging.qonsulin.id', 'Data dummy: pembayaran uji ditolak.', null, null, now() - interval '1 day');

  -- Approved opening and replies: visible in the anonymous-letter pool and detail view.
  insert into public.letter_threads (author_id, topic, status, created_at, updated_at)
  values (v_free_user, 'Mengelola overthinking', 'open', now() - interval '5 days', now() - interval '4 days')
  returning id into v_thread_id;
  insert into public.letters (thread_id, sender_id, is_opening, reply_type, template_code, title, content, moderation_status, reviewed_at, review_note, created_at, updated_at)
  values (v_thread_id, v_free_user, true, 'community', 'warm_pastel', 'Belajar memberi jeda pada pikiran', 'Ini data dummy staging. Aku sedang belajar memberi jeda saat pikiran terasa penuh dan ingin mencoba langkah kecil yang lebih tenang.', 'approved', now() - interval '5 days', 'Data dummy disetujui untuk menguji Kolam Surat.', now() - interval '5 days', now() - interval '5 days');
  insert into public.letters (thread_id, sender_id, is_opening, reply_type, template_code, content, moderation_status, reviewed_at, review_note, created_at, updated_at)
  values
    (v_thread_id, v_community_user, false, 'community', 'vintage_parchment', 'Terima kasih sudah berbagi. Semoga kamu dapat mengambil jeda singkat, bernapas perlahan, dan tidak menuntut dirimu menyelesaikan semuanya sekaligus.', 'approved', now() - interval '4 days', 'Data dummy balasan komunitas disetujui.', now() - interval '4 days', now() - interval '4 days'),
    (v_thread_id, v_moderator_user, false, 'volunteer', 'night_sky', 'Kamu tidak harus memikul semuanya sendiri. Jika memungkinkan, coba pilih satu hal kecil yang bisa kamu lakukan hari ini dan beri dirimu ruang untuk beristirahat.', 'approved', now() - interval '3 days', 'Data dummy balasan moderator disetujui.', now() - interval '3 days', now() - interval '3 days');

  -- Pending opening: available in the moderation queue only.
  insert into public.letter_threads (author_id, topic, status, created_at, updated_at)
  values (v_premium_user, 'Kelelahan setelah bekerja', 'open', now() - interval '1 day', now() - interval '1 day')
  returning id into v_thread_id;
  insert into public.letters (thread_id, sender_id, is_opening, reply_type, template_code, title, content, moderation_status, created_at, updated_at)
  values (v_thread_id, v_premium_user, true, 'community', 'botanical_sage', 'Ruang istirahat untuk diri sendiri', 'Ini data dummy staging. Aku ingin mengingat bahwa beristirahat bukan berarti gagal dan aku boleh meminta dukungan saat tenaga terasa menipis.', 'pending', now() - interval '1 day', now() - interval '1 day');

  -- Rejected opening: validates the rejected-state moderation UI.
  insert into public.letter_threads (author_id, topic, status, created_at, updated_at)
  values (v_community_user, 'Data uji moderasi', 'closed', now() - interval '3 days', now() - interval '2 days')
  returning id into v_thread_id;
  insert into public.letters (thread_id, sender_id, is_opening, reply_type, template_code, title, content, moderation_status, reviewed_at, review_note, created_at, updated_at)
  values (v_thread_id, v_community_user, true, 'community', 'vintage_parchment', 'Contoh surat untuk ditolak', 'Ini data dummy staging untuk memverifikasi tampilan surat yang tidak lolos moderasi dan tidak muncul di Kolam Surat.', 'rejected', now() - interval '2 days', 'Data dummy: ditolak untuk pengujian workflow.', now() - interval '3 days', now() - interval '2 days');

  -- Crisis hold uses neutral text; the status alone exercises the safety-review queue.
  insert into public.letter_threads (author_id, topic, status, created_at, updated_at)
  values (v_premium_user, 'Pemeriksaan keselamatan', 'flagged', now() - interval '6 hours', now() - interval '6 hours')
  returning id into v_thread_id;
  insert into public.letters (thread_id, sender_id, is_opening, reply_type, template_code, title, content, moderation_status, review_note, created_at, updated_at)
  values (v_thread_id, v_premium_user, true, 'community', 'night_sky', 'Contoh antrean pemeriksaan', 'Ini data dummy staging dengan status pemeriksaan keselamatan agar tim dapat menguji antrean moderasi tanpa menggunakan cerita atau identitas nyata.', 'crisis_hold', 'Data dummy: jangan tampilkan di Kolam Surat sebelum simulasi penanganan selesai.', now() - interval '6 hours', now() - interval '6 hours');
end;
$$;
