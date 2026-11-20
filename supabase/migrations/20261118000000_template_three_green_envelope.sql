update public.letter_templates
set
  name = 'Hutan Mawar',
  paper_style = 'paper-evergreen-rose',
  wax_seal_color = '#8a3328',
  tier_required = 'premium',
  is_active = true,
  sort_order = 3
where code = 'night_sky';

delete from public.letter_threads
where id in (
  select distinct thread_id
  from public.letters
  where template_code = 'botanical_sage' and is_opening = true
);

delete from public.letters
where template_code = 'botanical_sage';

delete from public.letter_templates
where code = 'botanical_sage';
