-- Tasks: isolation and complete_task() scheduling. Run: npm run test:db
begin;
create extension if not exists pgtap with schema extensions;
create temp table tap (at timestamptz default clock_timestamp(), line text);
grant all on tap to authenticated, anon;
insert into tap (line) select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@rls.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@rls.test'),
  ('00000000-0000-0000-0000-00000000000c', 'c@rls.test');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.today() returns date language sql as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;
create function pg_temp.due(t text) returns date language sql as $$
  select due_date from public.tasks where title = t;
$$;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select public.create_household('A home', 'Alice');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select public.create_household('B home', 'Bob');

reset role;
create temp table hh as select id, name from households;
grant select on hh to authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into tasks (household_id, title, due_date, repeat_every, repeat_unit)
select (select id from hh where name = 'A home'), t.title, t.due, t.every, t.unit
from (values
  ('once',    pg_temp.today(),      null::int, null),
  ('weekly',  pg_temp.today() + 3,  1,         'week'),
  ('overdue', pg_temp.today() - 30, 90,        'day'),
  ('monthly', date '2099-01-31',    1,         'month')
) as t (title, due, every, unit);

reset role;
create temp table tk as select id, title from tasks where household_id = (select id from hh where name = 'A home');
grant select on tk to authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

insert into tap (line) select throws_ok(
  $$ insert into tasks (household_id, title, due_date, assignee_id)
     select id, 'x', current_date, '00000000-0000-0000-0000-00000000000c' from hh where name = 'A home' $$,
  '23503', null, 'assignee must be a household member');

-- As B
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into tap (line) select is((select count(*) from tasks), 0::bigint, 'B cannot see A tasks');
insert into tap (line) select throws_ok(
  $$ insert into tasks (household_id, title, due_date) select id, 'x', current_date from hh where name = 'A home' $$,
  '42501', null, 'B cannot add tasks to A home');
insert into tap (line) select throws_ok(
  format('select complete_task(%L)', (select id from tk where title = 'once')),
  'P0001', null, 'B cannot complete A tasks');

-- As A: scheduling
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select complete_task(id) from tasks where title in ('once', 'weekly', 'overdue', 'monthly');

insert into tap (line) select ok((select completed_at from tasks where title = 'once') is not null, 'one-off task closes');
insert into tap (line) select is((select count(*) from task_completions), 4::bigint, 'each completion is logged');
insert into tap (line) select is(pg_temp.due('weekly'), pg_temp.today() + 10, 'early: next date counts from due date');
insert into tap (line) select is(pg_temp.due('overdue'), pg_temp.today() + 90, 'late: next date counts from today');
insert into tap (line) select is(pg_temp.due('monthly'), date '2099-02-28', 'month step clamps to month end');
insert into tap (line) select throws_ok(
  format('select complete_task(%L)', (select id from tasks where title = 'once')),
  'P0001', null, 'done one-off cannot be completed again');

-- Assignee who leaves is unassigned, task stays
reset role;
insert into household_members (household_id, user_id, display_name)
  select id, '00000000-0000-0000-0000-00000000000b', 'Bob' from hh where name = 'A home';
update tasks set assignee_id = '00000000-0000-0000-0000-00000000000b' where title = 'weekly';
delete from household_members
  where user_id = '00000000-0000-0000-0000-00000000000b' and household_id = (select id from hh where name = 'A home');
insert into tap (line) select ok((select assignee_id from tasks where title = 'weekly') is null, 'leaving member is unassigned');

insert into tap (line) select * from finish();
select line from tap order by at;
rollback;
