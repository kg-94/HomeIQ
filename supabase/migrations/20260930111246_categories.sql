-- Per-household category lists for money: 'expense' (expenses and bills) and
-- 'income' (incomes and recurring sources). Entries keep storing the category
-- *name* as text; rename/delete below rewrite those names in one go.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  kind text not null check (kind in ('expense', 'income')),
  name text not null check (length(trim(name)) between 1 and 60 and name = trim(name)),
  created_at timestamptz not null default now()
);
create unique index categories_unique_name on public.categories (household_id, kind, lower(name));

alter table public.categories enable row level security;
create policy "members all" on public.categories
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

-- Defaults for every household, including new ones.
create function public.seed_default_categories(hid uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.categories (household_id, kind, name)
  select hid, d.kind, d.name
  from (values
    ('expense', 'Rent'), ('expense', 'Groceries'), ('expense', 'Electricity'), ('expense', 'Water'),
    ('expense', 'Gas'), ('expense', 'Internet'), ('expense', 'Household help'), ('expense', 'Maintenance'),
    ('expense', 'Eating out'), ('expense', 'Other'),
    ('income', 'Salary'), ('income', 'Rent received'), ('income', 'Business'), ('income', 'Freelance'),
    ('income', 'Interest & dividends'), ('income', 'Refund'), ('income', 'Gift'), ('income', 'Other')
  ) as d (kind, name)
  on conflict do nothing;
$$;
revoke execute on function public.seed_default_categories from public, anon, authenticated;

create function public.seed_categories_on_household() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.seed_default_categories(new.id);
  return new;
end;
$$;
create trigger seed_categories after insert on public.households
  for each row execute function public.seed_categories_on_household();

-- Existing households: defaults plus every category already in use.
select public.seed_default_categories(id) from public.households;
insert into public.categories (household_id, kind, name)
select distinct household_id, 'expense', trim(category) from public.expenses where trim(coalesce(category, '')) <> ''
union select distinct household_id, 'expense', trim(category) from public.bills where trim(coalesce(category, '')) <> ''
union select distinct household_id, 'income', trim(category) from public.incomes where trim(coalesce(category, '')) <> ''
union select distinct household_id, 'income', trim(category) from public.income_sources where trim(coalesce(category, '')) <> ''
on conflict do nothing;

-- Rename a category and every entry using it. security definer so it also
-- relabels other members' private income (only the label changes); membership
-- is checked explicitly.
create function public.rename_category(p_id uuid, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.categories;
  new_name text := trim(p_name);
begin
  select * into c from public.categories where id = p_id;
  if not found or not public.is_member(c.household_id) then
    raise exception 'Category not found';
  end if;
  update public.categories set name = new_name where id = c.id;
  if c.kind = 'expense' then
    update public.expenses set category = new_name where household_id = c.household_id and lower(category) = lower(c.name);
    update public.bills set category = new_name where household_id = c.household_id and lower(category) = lower(c.name);
  else
    update public.incomes set category = new_name where household_id = c.household_id and lower(category) = lower(c.name);
    update public.income_sources set category = new_name where household_id = c.household_id and lower(category) = lower(c.name);
  end if;
end;
$$;

-- Delete a category; its entries move to p_move_to (merge) or become uncategorised.
create function public.delete_category(p_id uuid, p_move_to uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.categories;
  target text;
begin
  select * into c from public.categories where id = p_id;
  if not found or not public.is_member(c.household_id) then
    raise exception 'Category not found';
  end if;
  if p_move_to is not null then
    select name into target from public.categories
      where id = p_move_to and household_id = c.household_id and kind = c.kind and id <> c.id;
    if not found then
      raise exception 'Pick another category of the same type to move entries into';
    end if;
  end if;
  if c.kind = 'expense' then
    update public.expenses set category = target where household_id = c.household_id and lower(category) = lower(c.name);
    update public.bills set category = target where household_id = c.household_id and lower(category) = lower(c.name);
  else
    update public.incomes set category = target where household_id = c.household_id and lower(category) = lower(c.name);
    update public.income_sources set category = target where household_id = c.household_id and lower(category) = lower(c.name);
  end if;
  delete from public.categories where id = c.id;
end;
$$;

revoke execute on function public.rename_category, public.delete_category from public, anon;
grant execute on function public.rename_category, public.delete_category to authenticated;
