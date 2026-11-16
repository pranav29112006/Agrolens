-- AgroLens database schema.
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again; everything is created only if missing.

-- Vector search for the RAG knowledge base (stage 2).
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- profiles: one row per signed-in user, filled from the onboarding screens
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text,
  language text,
  -- Approximate location only, to about 1 km.
  latitude numeric(6, 2),
  longitude numeric(6, 2),
  -- How the farmer grows; null if skipped. See migrations/002_grower_type.sql.
  grower_type text constraint profiles_grower_type_check
    check (grower_type in ('pots', 'home_garden', 'fields')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "Users create own profile" on public.profiles;
create policy "Users create own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Give every new account an empty profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- user_crops: the crops each farmer grows
-- crop_id matches the ids in mobile/src/constants/crops.ts, e.g. 'bitter_gourd'.
-- ---------------------------------------------------------------------------
create table if not exists public.user_crops (
  user_id uuid not null references auth.users on delete cascade,
  crop_id text not null,
  added_at timestamptz not null default now(),
  primary key (user_id, crop_id)
);

alter table public.user_crops enable row level security;

drop policy if exists "Users manage own crops" on public.user_crops;
create policy "Users manage own crops" on public.user_crops
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- diagnoses: one row per leaf photo the CNN classifies
-- ---------------------------------------------------------------------------
create table if not exists public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  crop_id text,
  -- Path inside the 'leaf-photos' storage bucket.
  image_path text,
  predicted_label text not null,
  confidence real,
  -- false when the model was unsure and the farmer was sent to an expert.
  is_confident boolean not null default true,
  advisory text,
  language text,
  latitude numeric(6, 2),
  longitude numeric(6, 2),
  created_at timestamptz not null default now()
);

create index if not exists diagnoses_user_created_idx
  on public.diagnoses (user_id, created_at desc);

alter table public.diagnoses enable row level security;

drop policy if exists "Users manage own diagnoses" on public.diagnoses;
create policy "Users manage own diagnoses" on public.diagnoses
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- kb_documents: the curated knowledge base the advisory layer retrieves from
-- ---------------------------------------------------------------------------
create table if not exists public.kb_documents (
  id bigint generated always as identity primary key,
  crop_id text,
  disease_label text not null,
  section text not null check (
    section in ('symptoms', 'treatment', 'prevention', 'severity', 'economic_impact')
  ),
  content text not null,
  language text not null default 'en',
  -- 384 matches all-MiniLM-L6-v2. Change it to match whichever model you use.
  embedding vector(384),
  source text,
  created_at timestamptz not null default now()
);

create index if not exists kb_documents_label_idx on public.kb_documents (disease_label);

-- Add once there are rows, to make similarity search fast:
-- create index on public.kb_documents using hnsw (embedding vector_cosine_ops);

alter table public.kb_documents enable row level security;

-- The knowledge base is shared and read-only for the app. Writing to it is done
-- from the backend with the service_role key, which bypasses these policies.
drop policy if exists "Anyone signed in can read the knowledge base" on public.kb_documents;
create policy "Anyone signed in can read the knowledge base" on public.kb_documents
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Storage for leaf photos. Each user gets a folder named after their user id.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('leaf-photos', 'leaf-photos', false)
on conflict (id) do nothing;

drop policy if exists "Users read own leaf photos" on storage.objects;
create policy "Users read own leaf photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'leaf-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users upload own leaf photos" on storage.objects;
create policy "Users upload own leaf photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'leaf-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete own leaf photos" on storage.objects;
create policy "Users delete own leaf photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'leaf-photos' and (storage.foldername(name))[1] = auth.uid()::text);
