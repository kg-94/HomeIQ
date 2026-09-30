-- Tags follow recurring things into the entries they create: paying a bill
-- tags its expense; receiving recurring income tags the income.

alter table public.income_sources add column tags text[] not null default '{}' check (cardinality(tags) <= 10);

create or replace function public.pay_bill(p_bill uuid, p_paid_by uuid, p_amount numeric default null) returns uuid
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
  update public.expenses set tags = b.tags where id = eid;

  if b.repeat_every is null then
    update public.bills set paid_at = now() where id = b.id;
  else
    update public.bills set due_date = public.next_due(b.due_date, b.repeat_every, b.repeat_unit, today) where id = b.id;
  end if;
  return eid;
end;
$$;

create or replace function public.receive_income(p_source uuid, p_amount numeric default null) returns uuid
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

  insert into public.incomes (household_id, description, category, amount, received_by, received_on, is_private, source_id, tags)
    values (s.household_id, s.name, s.category, coalesce(p_amount, s.amount), s.received_by, today, s.is_private, s.id, s.tags)
    returning id into iid;
  update public.income_sources
    set next_date = public.next_due(s.next_date, s.repeat_every, s.repeat_unit, today)
    where id = s.id;
  return iid;
end;
$$;
