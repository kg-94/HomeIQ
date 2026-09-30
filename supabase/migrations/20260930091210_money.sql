-- Bills, shared expenses, splits, settlements and balances.
-- Money is numeric(12,2). Balance > 0 means the household owes that member.

-- Shared recurrence step (also used by complete_task): from the due date, or
-- from today if late. Month steps clamp at month end (Jan 31 -> Feb 28).
create function public.next_due(due date, every int, unit text, today date) returns date
language sql immutable set search_path = '' as $$
  select (greatest(due, today) + make_interval(
    days   => case unit when 'day'   then every when 'week' then 7 * every else 0 end,
    months => case unit when 'month' then every else 0 end,
    years  => case unit when 'year'  then every else 0 end
  ))::date;
$$;

create or replace function public.complete_task(task uuid) returns void
language plpgsql set search_path = '' as $$
declare
  t public.tasks;
  today date;
begin
  select tk.* into t from public.tasks tk where tk.id = task and tk.completed_at is null for update;
  if not found then
    raise exception 'Task not found or already done';
  end if;
  select (now() at time zone h.timezone)::date into today from public.households h where h.id = t.household_id;

  insert into public.task_completions (task_id, household_id, due_date)
    values (t.id, t.household_id, t.due_date);

  if t.repeat_every is null then
    update public.tasks set completed_at = now() where id = t.id;
  else
    update public.tasks
      set due_date = public.next_due(t.due_date, t.repeat_every, t.repeat_unit, today)
      where id = t.id;
  end if;
end;
$$;

-- Is `uid` currently in household `hid`? (is_member checks the caller.)
create function public.is_household_user(hid uuid, uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.household_members where household_id = hid and user_id = uid);
$$;

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  payee text check (length(payee) <= 120),
  category text check (length(category) <= 60),
  amount numeric(12, 2) not null check (amount > 0),
  due_date date not null,
  repeat_every int check (repeat_every between 1 and 999),
  repeat_unit text check (repeat_unit in ('day', 'week', 'month', 'year')),
  autopay boolean not null default false,
  notes text check (length(notes) <= 2000),
  paid_at timestamptz, -- one-off bills close when paid
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((repeat_every is null) = (repeat_unit is null)),
  unique (household_id, id)
);
create index on public.bills (household_id, due_date) where paid_at is null;

-- paid_by / split users reference auth.users, not household_members, so a
-- member's history (and everyone's balances) survive them leaving. Current
-- membership is enforced at write time by RLS instead.
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  description text not null check (length(trim(description)) between 1 and 120),
  category text check (length(category) <= 60),
  amount numeric(12, 2) not null check (amount > 0),
  paid_by uuid not null references auth.users (id),
  spent_on date not null,
  bill_id uuid,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (household_id, id),
  foreign key (household_id, bill_id) references public.bills (household_id, id) on delete set null (bill_id)
);
create index on public.expenses (household_id, spent_on desc);

create table public.expense_splits (
  expense_id uuid not null,
  household_id uuid not null,
  user_id uuid not null references auth.users (id),
  share numeric(12, 2) not null check (share >= 0),
  primary key (expense_id, user_id),
  foreign key (household_id, expense_id) references public.expenses (household_id, id) on delete cascade
);
create index on public.expense_splits (household_id, user_id);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  from_user uuid not null references auth.users (id),
  to_user uuid not null references auth.users (id),
  amount numeric(12, 2) not null check (amount > 0),
  settled_on date not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);
create index on public.settlements (household_id, settled_on desc);

-- Splits must add up to the expense amount. Deferred to commit so an expense
-- and its splits can be written in any order within one transaction.
create function public.check_split_total() returns trigger
language plpgsql set search_path = '' as $$
declare
  eid uuid;
  amt numeric;
  total numeric;
begin
  -- (a CASE would resolve both branches' fields; each table has only one)
  if tg_table_name = 'expenses' then
    eid := coalesce(new.id, old.id);
  else
    eid := coalesce(new.expense_id, old.expense_id);
  end if;
  select amount into amt from public.expenses where id = eid;
  if not found then
    return null; -- expense deleted
  end if;
  select coalesce(sum(share), 0) into total from public.expense_splits where expense_id = eid;
  if total <> amt then
    raise exception 'Split shares (%) must add up to the expense amount (%)', total, amt;
  end if;
  return null;
end;
$$;

create constraint trigger split_total after insert or update of amount on public.expenses
  deferrable initially deferred for each row execute function public.check_split_total();
create constraint trigger split_total after insert or update or delete on public.expense_splits
  deferrable initially deferred for each row execute function public.check_split_total();

alter table public.bills enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;

create policy "members all" on public.bills
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy "members all" on public.expenses
  for all to authenticated
  using (public.is_member(household_id))
  with check (public.is_member(household_id) and public.is_household_user(household_id, paid_by));

create policy "members all" on public.expense_splits
  for all to authenticated
  using (public.is_member(household_id))
  with check (public.is_member(household_id) and public.is_household_user(household_id, user_id));

create policy "members read" on public.settlements
  for select to authenticated using (public.is_member(household_id));
create policy "members record" on public.settlements
  for insert to authenticated
  with check (
    public.is_member(household_id)
    and public.is_household_user(household_id, from_user)
    and public.is_household_user(household_id, to_user)
  );
create policy "members delete" on public.settlements
  for delete to authenticated using (public.is_member(household_id));

create view public.member_balances with (security_invoker = true) as
select household_id, user_id, sum(delta)::numeric(12, 2) as balance
from (
  select household_id, paid_by as user_id, amount as delta from public.expenses
  union all select household_id, user_id, -share from public.expense_splits
  union all select household_id, from_user, amount from public.settlements
  union all select household_id, to_user, -amount from public.settlements
) t
group by household_id, user_id;

-- Creates (p_id null) or replaces an expense and its splits in one call.
-- splits: [{"user_id": "...", "share": 123.45}, ...]
-- security invoker: RLS checks membership of the caller, payer and split users.
create function public.save_expense(
  p_id uuid,
  p_household uuid,
  p_description text,
  p_amount numeric,
  p_paid_by uuid,
  p_spent_on date,
  p_category text,
  p_splits jsonb,
  p_bill uuid default null
) returns uuid
language plpgsql set search_path = '' as $$
declare
  eid uuid := coalesce(p_id, gen_random_uuid());
begin
  if p_id is null then
    insert into public.expenses (id, household_id, description, amount, paid_by, spent_on, category, bill_id)
      values (eid, p_household, p_description, p_amount, p_paid_by, p_spent_on, p_category, p_bill);
  else
    update public.expenses
      set description = p_description, amount = p_amount, paid_by = p_paid_by,
          spent_on = p_spent_on, category = p_category
      where id = eid and household_id = p_household;
    if not found then
      raise exception 'Expense not found';
    end if;
    delete from public.expense_splits where expense_id = eid;
  end if;

  insert into public.expense_splits (expense_id, household_id, user_id, share)
    select eid, p_household, (s ->> 'user_id')::uuid, (s ->> 'share')::numeric
    from jsonb_array_elements(p_splits) s;
  return eid;
end;
$$;

-- Records a bill payment as an expense split equally among current members
-- (remainder paise go to the first members), then advances or closes the bill.
create function public.pay_bill(p_bill uuid, p_paid_by uuid, p_amount numeric default null) returns uuid
language plpgsql set search_path = '' as $$
declare
  b public.bills;
  today date;
  amt numeric;
  paise bigint;
  n int;
  splits jsonb;
  eid uuid;
begin
  select * into b from public.bills where id = p_bill and paid_at is null for update;
  if not found then
    raise exception 'Bill not found or already paid';
  end if;
  select (now() at time zone h.timezone)::date into today from public.households h where h.id = b.household_id;
  amt := coalesce(p_amount, b.amount);
  if amt <= 0 then
    raise exception 'Amount must be positive';
  end if;

  paise := round(amt * 100);
  select count(*) into n from public.household_members where household_id = b.household_id;
  select jsonb_agg(jsonb_build_object(
           'user_id', user_id,
           'share', ((paise / n) + case when rn <= paise % n then 1 else 0 end) / 100.0))
    into splits
    from (select user_id, row_number() over (order by created_at, user_id) as rn
          from public.household_members where household_id = b.household_id) m;

  eid := public.save_expense(null, b.household_id, b.name, amt, p_paid_by, today, b.category, splits, b.id);

  if b.repeat_every is null then
    update public.bills set paid_at = now() where id = b.id;
  else
    update public.bills set due_date = public.next_due(b.due_date, b.repeat_every, b.repeat_unit, today) where id = b.id;
  end if;
  return eid;
end;
$$;

revoke execute on function public.save_expense, public.pay_bill from public, anon;
grant execute on function public.save_expense, public.pay_bill to authenticated;
