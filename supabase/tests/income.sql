-- Income visibility (shared vs private) and recurring sources. Run: npm run test:db
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

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select public.create_household('A home', 'Alice');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select public.create_household('C home', 'Carol');
reset role;
insert into household_members (household_id, user_id, display_name)
  select id, '00000000-0000-0000-0000-00000000000b', 'Bob' from households where name = 'A home';
create temp table hh as select id, name from households;
grant select on hh to authenticated;
create function pg_temp.a_home() returns uuid language sql as $$ select id from hh where name = 'A home' $$;

-- As A: one shared, one private income
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into incomes (household_id, description, amount, received_on) values (pg_temp.a_home(), 'Rent from tenant', 15000, current_date);
insert into incomes (household_id, description, amount, received_on, is_private) values (pg_temp.a_home(), 'Alice salary', 90000, current_date, true);
insert into tap (line) select is((select count(*) from incomes), 2::bigint, 'owner sees shared and own private income');

insert into tap (line) select throws_ok(format(
  $q$insert into incomes (household_id, description, amount, received_on, received_by, is_private)
     values (%L, 'x', 1, current_date, '00000000-0000-0000-0000-00000000000b', true)$q$, pg_temp.a_home()),
  '42501', null, 'cannot mark someone else''s income private');
insert into tap (line) select lives_ok(format(
  $q$insert into incomes (household_id, description, amount, received_on, received_by)
     values (%L, 'Bob freelance', 5000, current_date, '00000000-0000-0000-0000-00000000000b')$q$, pg_temp.a_home()),
  'can record shared income received by another member');
insert into tap (line) select throws_ok(format(
  $q$insert into incomes (household_id, description, amount, received_on, received_by)
     values (%L, 'x', 1, current_date, '00000000-0000-0000-0000-00000000000c')$q$, pg_temp.a_home()),
  '42501', null, 'recipient must be a household member');

-- As B: sees shared only; cannot touch A's private income
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into tap (line) select results_eq(
  $$ select description from incomes order by description $$,
  $$ values ('Bob freelance'), ('Rent from tenant') $$, 'other member sees only shared income');
with u as (update incomes set amount = 1 where description = 'Alice salary' returning 1)
insert into tap (line) select is(count(*), 0::bigint, 'other member cannot edit private income') from u;

-- As C: other household sees nothing
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
insert into tap (line) select is((select count(*) from incomes), 0::bigint, 'other household sees no income');

-- Recurring private salary for A
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into income_sources (household_id, name, amount, next_date, repeat_every, repeat_unit, is_private)
  values (pg_temp.a_home(), 'Salary', 90000, (now() at time zone 'Asia/Kolkata')::date, 1, 'month', true);
select receive_income(id, 91000) from income_sources where name = 'Salary';
insert into tap (line) select is(
  (select amount from incomes where source_id is not null), 91000.00, 'receiving logs the actual amount');
insert into tap (line) select ok(
  (select is_private from incomes where source_id is not null), 'logged income keeps the source''s privacy');
insert into tap (line) select is(
  (select next_date from income_sources where name = 'Salary'),
  ((now() at time zone 'Asia/Kolkata')::date + interval '1 month')::date, 'source moves to next date');

reset role;
create temp table src as select id from income_sources where household_id = pg_temp.a_home();
grant select on src to authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into tap (line) select throws_ok(
  format('select receive_income(%L)', (select id from src)), 'P0001', null,
  'other member cannot see or receive a private source');

insert into tap (line) select * from finish();
select line from tap order by at;
rollback;
