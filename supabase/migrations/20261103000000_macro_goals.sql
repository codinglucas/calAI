-- Optional daily macro goals in grams. Null means the user has no goal for that
-- macro. Same bounds as lib/validation/profile.ts.
alter table public.profiles
  add column protein_goal_g integer check (protein_goal_g between 1 and 2000),
  add column carbs_goal_g integer check (carbs_goal_g between 1 and 2000),
  add column fat_goal_g integer check (fat_goal_g between 1 and 2000);
