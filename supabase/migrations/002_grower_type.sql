-- Adds "how do you grow" (pots, home garden or fields) to each profile.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again.

alter table public.profiles
  add column if not exists grower_type text;

alter table public.profiles
  drop constraint if exists profiles_grower_type_check;

alter table public.profiles
  add constraint profiles_grower_type_check
  check (grower_type in ('pots', 'home_garden', 'fields'));

comment on column public.profiles.grower_type is
  'How the farmer grows: pots, home_garden or fields. Null if skipped. Used to scale advice.';

-- Make the new column visible to the app straight away.
notify pgrst, 'reload schema';
