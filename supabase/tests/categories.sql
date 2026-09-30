-- Money categories: defaults, isolation, rename/merge/delete rewriting entries. Run: npm run test:db
begin;
create extension if not exists pgtap with schema extensions;
create temp table tap (at timestamptz default clock_timestamp(), line text);
grant all on tap to authenticated, anon;
insert into tap (line) select plan(10);

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
create function pg_temp.cat(k text, n text) returns uuid language sql as $$
  select id from public.categories where household_id = pg_temp.a_home() and kind = k and name = n
$$;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into tap (line) select ok(
  (select count(*) from categories where kind = 'expense') >= 5 and (select count(*) from categories where kind = 'income') >= 5,
  'new household gets default expense and income categories');
insert into tap (line) select throws_ok(
  format($q$insert into categories (household_id, kind, name) values (%L, 'expense', 'groceries')$q$, pg_temp.a_home()),
  '23505', null, 'names are unique per type, ignoring case');

-- Entries using categories: a shared expense + bill, and B's private income
select save_expense(null, pg_temp.a_home(), 'Veg', 100, '00000000-0000-0000-0000-00000000000a', current_date, 'Groceries',
  '[{"user_id":"00000000-0000-0000-0000-00000000000a","share":100}]');
insert into bills (household_id, name, amount, due_date, category) values (pg_temp.a_home(), 'DMart', 500, current_date, 'Groceries');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into incomes (household_id, description, amount, received_on, category, is_private)
  values (pg_temp.a_home(), 'Bob salary', 1000, current_date, 'Salary', true);

-- A renames; B's private income is relabelled too (A still can't see it)
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select rename_category(pg_temp.cat('expense', 'Groceries'), 'Food & groceries');
select rename_category(pg_temp.cat('income', 'Salary'), 'Salaries');
insert into tap (line) select is((select category from expenses where description = 'Veg'), 'Food & groceries', 'rename updates expenses');
insert into tap (line) select is((select category from bills where name = 'DMart'), 'Food & groceries', 'rename updates bills');
insert into tap (line) select is((select count(*) from incomes), 0::bigint, 'A still cannot see B''s private income');
reset role;
insert into tap (line) select is((select category from incomes where description = 'Bob salary'), 'Salaries', 'rename relabels private income');

-- Merge and plain delete
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select delete_category(pg_temp.cat('expense', 'Food & groceries'), pg_temp.cat('expense', 'Other'));
insert into tap (line) select is((select category from expenses where description = 'Veg'), 'Other', 'delete with move merges entries');
select delete_category(pg_temp.cat('expense', 'Other'));
insert into tap (line) select ok((select category from bills where name = 'DMart') is null, 'delete without move leaves entries uncategorised');

-- Other household
reset role;
create temp table a_rent as select id from categories where household_id = pg_temp.a_home() and kind = 'expense' and name = 'Rent';
grant select on a_rent to authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
insert into tap (line) select ok((select bool_and(household_id <> pg_temp.a_home()) from categories), 'other household sees only its own categories');
insert into tap (line) select throws_ok(
  format('select rename_category(%L, %L)', (select id from a_rent), 'Hacked'), 'P0001', null, 'another household cannot rename your category');

insert into tap (line) select * from finish();
select line from tap order by at;
rollback;
