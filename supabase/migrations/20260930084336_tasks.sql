-- Maintenance & recurring tasks.

-- "Today" and "overdue" are household-local, not UTC.
alter table public.households
  add column timezone text not null default 'Asia/Kolkata';

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 120),
  notes text check (length(notes) <= 2000),
  assignee_id uuid,
  due_date date not null,
  repeat_every int check (repeat_every between 1 and 999),
  repeat_unit text check (repeat_unit in ('day', 'week', 'month', 'year')),
  completed_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((repeat_every is null) = (repeat_unit is null)),
  -- Assignee must be a member; clears itself if they leave.
  foreign key (household_id, assignee_id)
    references public.household_members (household_id, user_id)
    on delete set null (assignee_id)
);
create index on public.tasks (household_id, due_date) where completed_at is null;

create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  due_date date not null,
  completed_by uuid default auth.uid() references auth.users (id) on delete set null,
  completed_at timestamptz not null default now()
);
create index on public.task_completions (task_id, completed_at desc);

alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;

create policy "members all" on public.tasks
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "members read" on public.task_completions
  for select to authenticated using (public.is_member(household_id));
create policy "members insert" on public.task_completions
  for insert to authenticated
  with check (public.is_member(household_id) and completed_by = (select auth.uid()));

-- Logs a completion; one-off tasks close, recurring ones move to the next date.
-- Next date counts from the due date, or from today if done late, so an
-- overdue "every 90 days" task isn't immediately overdue again.
-- ponytail: month steps clamp (Jan 31 -> Feb 28 -> Mar 28); store an anchor day if that drift matters.
-- security invoker: RLS decides whether the caller may touch the task.
create function public.complete_task(task uuid) returns void
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
      set due_date = (greatest(t.due_date, today) + make_interval(
        days   => case t.repeat_unit when 'day'   then t.repeat_every when 'week' then 7 * t.repeat_every else 0 end,
        months => case t.repeat_unit when 'month' then t.repeat_every else 0 end,
        years  => case t.repeat_unit when 'year'  then t.repeat_every else 0 end
      ))::date
      where id = t.id;
  end if;
end;
$$;

revoke execute on function public.complete_task from public, anon;
grant execute on function public.complete_task to authenticated;
