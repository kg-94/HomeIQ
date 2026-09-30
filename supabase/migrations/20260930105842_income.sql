-- Income: one-off entries plus recurring sources (salary, rent received) that
-- are marked received like bills. Not split and not part of member balances.
-- Each entry is shared with the household or private to the person who received it.

create table public.income_sources (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  category text check (length(category) <= 60),
  amount numeric(12, 2) not null check (amount > 0),
  next_date date not null,
  repeat_every int not null check (repeat_every between 1 and 999),
  repeat_unit text not null check (repeat_unit in ('day', 'week', 'month', 'year')),
  received_by uuid not null default auth.uid() references auth.users (id),
  is_private boolean not null default false,
  notes text check (length(notes) <= 2000),
  created_at timestamptz not null default now(),
  unique (household_id, id)
);
create index on public.income_sources (household_id, next_date);

create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  description text not null check (length(trim(description)) between 1 and 120),
  category text check (length(category) <= 60),
  amount numeric(12, 2) not null check (amount > 0),
  received_by uuid not null default auth.uid() references auth.users (id),
  received_on date not null,
  is_private boolean not null default false,
  source_id uuid,
  created_at timestamptz not null default now(),
  foreign key (household_id, source_id) references public.income_sources (household_id, id) on delete set null (source_id)
);
create index on public.incomes (household_id, received_on desc);

alter table public.income_sources enable row level security;
alter table public.incomes enable row level security;

-- Visible: shared rows to every member, private rows only to their owner.
-- Writable: the same rows; the recipient must be a member, and only you can
-- mark something private (and only for yourself).
create policy "members see shared, owner sees private" on public.income_sources
  for all to authenticated
  using (public.is_member(household_id) and (not is_private or received_by = (select auth.uid())))
  with check (
    public.is_member(household_id)
    and public.is_household_user(household_id, received_by)
    and (not is_private or received_by = (select auth.uid()))
  );

create policy "members see shared, owner sees private" on public.incomes
  for all to authenticated
  using (public.is_member(household_id) and (not is_private or received_by = (select auth.uid())))
  with check (
    public.is_member(household_id)
    and public.is_household_user(household_id, received_by)
    and (not is_private or received_by = (select auth.uid()))
  );

-- One tap on a recurring source: log the income (with the source's privacy and
-- recipient) and move the source to its next date. security invoker: RLS applies.
create function public.receive_income(p_source uuid, p_amount numeric default null) returns uuid
language plpgsql set search_path = '' as $$
declare
  s public.income_sources;
  today date;
  iid uuid;
begin
  select * into s from public.income_sources where id = p_source for update;
  if not found then
    raise exception 'Income source not found';
  end if;
  select (now() at time zone h.timezone)::date into today from public.households h where h.id = s.household_id;

  insert into public.incomes (household_id, description, category, amount, received_by, received_on, is_private, source_id)
    values (s.household_id, s.name, s.category, coalesce(p_amount, s.amount), s.received_by, today, s.is_private, s.id)
    returning id into iid;
  update public.income_sources
    set next_date = public.next_due(s.next_date, s.repeat_every, s.repeat_unit, today)
    where id = s.id;
  return iid;
end;
$$;

revoke execute on function public.receive_income from public, anon;
grant execute on function public.receive_income to authenticated;
