-- Ownership transfer and account deletion. Run: npm run test:db
begin;
create extension if not exists pgtap with schema extensions;
create temp table tap (at timestamptz default clock_timestamp(), line text);
grant all on tap to authenticated, anon;
insert into tap (line) select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@rls.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@rls.test');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- A owns "Shared" (with B) and "Solo" (with an offline member)
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select public.create_household('Shared', 'Alice');
select public.create_household('Solo', 'Alice');
reset role;
create temp table hh as select id, name from households where name in ('Shared', 'Solo') and created_by = '00000000-0000-0000-0000-00000000000a';
grant select on hh to authenticated;
create function pg_temp.h(n text) returns uuid language sql as $$ select id from hh where name = n $$;
insert into household_members (household_id, user_id, display_name)
  values (pg_temp.h('Shared'), '00000000-0000-0000-0000-00000000000b', 'Bob');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
create temp table om as select add_offline_member(pg_temp.h('Solo'), 'Kid') as id;
select save_expense(null, pg_temp.h('Shared'), 'Groceries', 100, '00000000-0000-0000-0000-00000000000a', current_date, null,
  '[{"user_id":"00000000-0000-0000-0000-00000000000a","share":50},{"user_id":"00000000-0000-0000-0000-00000000000b","share":50}]');
insert into incomes (household_id, description, amount, received_on, is_private) values (pg_temp.h('Shared'), 'A salary', 1000, current_date, true);
insert into incomes (household_id, description, amount, received_on) values (pg_temp.h('Shared'), 'Rent in', 500, current_date);

-- Transfer rules
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into tap (line) select throws_ok(format('select transfer_ownership(%L, %L)', pg_temp.h('Shared'), '00000000-0000-0000-0000-00000000000b'),
  'P0001', null, 'a non-owner cannot transfer ownership');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into tap (line) select throws_ok(format('select transfer_ownership(%L, %L)', pg_temp.h('Solo'), (select id from om)),
  'P0001', null, 'ownership cannot go to an offline member');

-- Deletion is blocked while A is Shared's only owner
insert into tap (line) select results_eq('select name from account_deletion_blockers()', $$ values ('Shared') $$, 'blockers list the shared household');
insert into tap (line) select throws_ok('select delete_my_account()', 'P0001', null, 'cannot delete account while sole owner of a shared household');

select transfer_ownership(pg_temp.h('Shared'), '00000000-0000-0000-0000-00000000000b');
insert into tap (line) select results_eq(
  format($q$select user_id::text, role from household_members where household_id = %L order by user_id$q$, pg_temp.h('Shared')),
  $$ values ('00000000-0000-0000-0000-00000000000a', 'member'), ('00000000-0000-0000-0000-00000000000b', 'owner') $$,
  'transfer swaps the roles');

insert into tap (line) select lives_ok('select delete_my_account()', 'account deletes once ownership is transferred');

reset role;
insert into tap (line) select is((select count(*) from auth.users where id = '00000000-0000-0000-0000-00000000000a'), 0::bigint, 'the account is gone');
insert into tap (line) select is((select count(*) from households where id = pg_temp.h('Solo')), 0::bigint, 'household where A was the only account holder is deleted');
insert into tap (line) select is(
  (select count(*) from household_members where household_id = pg_temp.h('Shared') and user_id = '00000000-0000-0000-0000-00000000000a'), 0::bigint,
  'membership in the shared household is removed');
insert into tap (line) select results_eq(
  format($q$select description from incomes where household_id = %L$q$, pg_temp.h('Shared')),
  $$ values ('Rent in') $$, 'private income is deleted, shared income stays');
insert into tap (line) select is(
  (select count(*) from expenses where household_id = pg_temp.h('Shared')), 1::bigint, 'shared expense history stays for the others');

insert into tap (line) select * from finish();
select line from tap order by at;
rollback;
