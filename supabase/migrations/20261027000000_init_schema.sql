-- Initial schema: profiles, meals, meal_items, row-level security,
-- and a trigger that creates a profile for every new auth user.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- True when `tz` is a time zone name Postgres understands (e.g. 'America/New_York').
-- Declared immutable so it can back a check constraint; the zone list only
-- changes with Postgres upgrades.
create function public.is_valid_timezone(tz text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  perform now() at time zone tz;
  return true;
exception
  when invalid_parameter_value then
    return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  daily_calorie_goal integer not null default 2000
    check (daily_calorie_goal between 500 and 10000),
  timezone text not null default 'America/New_York'
    check (public.is_valid_timezone(timezone)),
  created_at timestamptz not null default now()
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  -- Stored in UTC; grouped into days using profiles.timezone at query time.
  eaten_at timestamptz not null default now(),
  meal_type text not null
    check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  created_at timestamptz not null default now()
);

create index meals_user_id_eaten_at_idx on public.meals (user_id, eaten_at desc);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  grams numeric(7, 1) not null check (grams >= 0),
  kcal integer not null check (kcal >= 0),
  protein_g numeric(6, 1) not null default 0 check (protein_g >= 0),
  carbs_g numeric(6, 1) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6, 1) not null default 0 check (fat_g >= 0),
  -- Text + check constraint (not an enum) so new sources such as 'usda' or
  -- 'label' can be added later with a one-line migration.
  source text not null default 'manual' check (source in ('ai', 'manual')),
  confidence text check (confidence in ('low', 'medium', 'high')),
  created_at timestamptz not null default now()
);

create index meal_items_meal_id_idx on public.meal_items (meal_id);

-- ---------------------------------------------------------------------------
-- Privileges: only signed-in users reach these tables through the Data API.
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.meals, public.meal_items from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.meals, public.meal_items to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;

-- Profiles are created by the signup trigger and removed when the auth user
-- is deleted, so users only need to read and update their own row.
create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can view their own meals"
  on public.meals for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own meals"
  on public.meals for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own meals"
  on public.meals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own meals"
  on public.meals for delete to authenticated
  using ((select auth.uid()) = user_id);

-- meal_items have no user_id; ownership comes from the parent meal.
create policy "Users can view items of their own meals"
  on public.meal_items for select to authenticated
  using (exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = (select auth.uid())
  ));

create policy "Users can insert items into their own meals"
  on public.meal_items for insert to authenticated
  with check (exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = (select auth.uid())
  ));

create policy "Users can update items of their own meals"
  on public.meal_items for update to authenticated
  using (exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = (select auth.uid())
  ));

create policy "Users can delete items of their own meals"
  on public.meal_items for delete to authenticated
  using (exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- Create a profile row for every new auth user
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
