-- Bills, expenses, splits, settlements, balances. Run: npm run test:db
begin;
create extension if not exists pgtap with schema extensions;
create temp table tap (at timestamptz default clock_timestamp(), line text);
grant all on tap to authenticated, anon;
insert into tap (line) select plan(15);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@rls.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@rls.test'),
  ('00000000-0000-0000-0000-00000000000c', 'c@rls.test');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
-- Split totals are checked at commit; force the check now (inside the test's savepoint).
create function pg_temp.checked(q text) returns text language sql as $$
  select format('do $d$ begin %s; set constraints all immediate; set constraints all deferred; end $d$', q);
$$;
create function pg_temp.balance(uid uuid) returns numeric language sql as $$
  select coalesce((select balance from public.member_balances where user_id = uid), 0);
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

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

insert into tap (line) select lives_ok(pg_temp.checked(format(
  $q$perform save_expense(null, %L, 'Groceries', 100, %L, current_date, null,
     '[{"user_id":"00000000-0000-0000-0000-00000000000a","share":50},{"user_id":"00000000-0000-0000-0000-00000000000b","share":50}]')$q$,
  pg_temp.a_home(), '00000000-0000-0000-0000-00000000000a')), 'expense with matching splits saves');

insert into tap (line) select throws_ok(pg_temp.checked(format(
  $q$perform save_expense(null, %L, 'Bad', 100, %L, current_date, null,
     '[{"user_id":"00000000-0000-0000-0000-00000000000a","share":60},{"user_id":"00000000-0000-0000-0000-00000000000b","share":30}]')$q$,
  pg_temp.a_home(), '00000000-0000-0000-0000-00000000000a')), 'P0001', null, 'splits must add up to the amount');

insert into tap (line) select throws_ok(format(
  $q$select save_expense(null, %L, 'x', 10, '00000000-0000-0000-0000-00000000000c', current_date, null,
     '[{"user_id":"00000000-0000-0000-0000-00000000000a","share":10}]')$q$, pg_temp.a_home()),
  '42501', null, 'payer must be a household member');

insert into tap (line) select throws_ok(format(
  $q$select save_expense(null, %L, 'x', 10, '00000000-0000-0000-0000-00000000000a', current_date, null,
     '[{"user_id":"00000000-0000-0000-0000-00000000000c","share":10}]')$q$, pg_temp.a_home()),
  '42501', null, 'split users must be household members');

insert into tap (line) select is(pg_temp.balance('00000000-0000-0000-0000-00000000000a'), 50.00, 'payer is owed their others'' share');
insert into tap (line) select is(pg_temp.balance('00000000-0000-0000-0000-00000000000b'), -50.00, 'other member owes their share');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
insert into tap (line) select is((select count(*) from expenses), 0::bigint, 'other household cannot see expenses');

-- Settle up
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into settlements (household_id, from_user, to_user, amount, settled_on)
  values (pg_temp.a_home(), '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 50, current_date);
insert into tap (line) select is(pg_temp.balance('00000000-0000-0000-0000-00000000000a'), 0.00, 'settlement clears the balance');
insert into tap (line) select throws_ok(format(
  $q$insert into settlements (household_id, from_user, to_user, amount, settled_on)
     values (%L, '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 5, current_date)$q$, pg_temp.a_home()),
  '23514', null, 'cannot settle with yourself');

-- Bills
insert into bills (household_id, name, amount, due_date, repeat_every, repeat_unit)
  values (pg_temp.a_home(), 'Electricity', 100.01, (now() at time zone 'Asia/Kolkata')::date, 1, 'month');
insert into bills (household_id, name, amount, due_date)
  values (pg_temp.a_home(), 'Plumber', 450, current_date);
select pay_bill(id, '00000000-0000-0000-0000-00000000000b') from bills where name in ('Electricity', 'Plumber');
set constraints all immediate;
set constraints all deferred;

insert into tap (line) select is(
  (select amount from expenses where description = 'Electricity'), 100.01, 'paying a bill records an expense');
insert into tap (line) select results_eq(
  $$ select share from expense_splits s join expenses e on e.id = s.expense_id
     where e.description = 'Electricity' order by share desc $$,
  $$ values (50.01::numeric(12,2)), (50.00::numeric(12,2)) $$, 'bill is split equally to the paisa');
insert into tap (line) select is(
  (select due_date from bills where name = 'Electricity'),
  ((now() at time zone 'Asia/Kolkata')::date + interval '1 month')::date, 'recurring bill moves to next due date');
insert into tap (line) select ok((select paid_at from bills where name = 'Plumber') is not null, 'one-off bill closes');
insert into tap (line) select throws_ok(
  format('select pay_bill(%L, %L)', (select id from bills where name = 'Plumber'), '00000000-0000-0000-0000-00000000000b'),
  'P0001', null, 'paid one-off bill cannot be paid again');

-- Edit keeps the invariant
insert into tap (line) select lives_ok(pg_temp.checked(format(
  $q$perform save_expense(%L, %L, 'Groceries', 80, %L, current_date, null,
     '[{"user_id":"00000000-0000-0000-0000-00000000000a","share":80}]')$q$,
  (select id from expenses where description = 'Groceries'), pg_temp.a_home(), '00000000-0000-0000-0000-00000000000a')),
  'expense can be edited with new splits');

insert into tap (line) select * from finish();
select line from tap order by at;
rollback;
