-- Save a meal and its items in one transaction, so a failed item insert
-- never leaves an empty meal behind. The functions run as the calling user
-- (security invoker), so the RLS policies from the init migration still apply.
--
-- p_items is a JSON array of objects with: name, grams, kcal, protein_g,
-- carbs_g, fat_g, and optionally source ('ai' | 'manual') and confidence.

-- Helpers live in a schema the Data API doesn't expose, so they can't be
-- called directly over HTTP.
create schema if not exists private;
grant usage on schema private to authenticated;

create function private.insert_meal_items(p_meal_id uuid, p_items jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.meal_items
    (meal_id, name, grams, kcal, protein_g, carbs_g, fat_g, source, confidence)
  select
    p_meal_id, i.name, i.grams, i.kcal, i.protein_g, i.carbs_g, i.fat_g,
    coalesce(i.source, 'manual'), i.confidence
  from jsonb_to_recordset(p_items) as i(
    name text, grams numeric, kcal integer, protein_g numeric,
    carbs_g numeric, fat_g numeric, source text, confidence text
  );
$$;

create function private.assert_has_items(p_items jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A meal needs at least one item' using errcode = '22023';
  end if;
end;
$$;

create function public.create_meal(
  p_meal_type text,
  p_eaten_at timestamptz,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_meal_id uuid;
begin
  perform private.assert_has_items(p_items);

  insert into public.meals (meal_type, eaten_at)
  values (p_meal_type, p_eaten_at)
  returning id into v_meal_id;

  perform private.insert_meal_items(v_meal_id, p_items);
  return v_meal_id;
end;
$$;

-- Replaces the meal's details and its full item list.
create function public.update_meal(
  p_meal_id uuid,
  p_meal_type text,
  p_eaten_at timestamptz,
  p_items jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.assert_has_items(p_items);

  update public.meals
  set meal_type = p_meal_type, eaten_at = p_eaten_at
  where id = p_meal_id;

  -- RLS hides other users' meals, so "not found" also covers "not yours".
  if not found then
    raise exception 'Meal not found' using errcode = 'P0002';
  end if;

  delete from public.meal_items where meal_id = p_meal_id;
  perform private.insert_meal_items(p_meal_id, p_items);
end;
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

revoke execute on function public.create_meal(text, timestamptz, jsonb) from public, anon;
revoke execute on function public.update_meal(uuid, text, timestamptz, jsonb) from public, anon;
grant execute on function public.create_meal(text, timestamptz, jsonb) to authenticated;
grant execute on function public.update_meal(uuid, text, timestamptz, jsonb) to authenticated;
