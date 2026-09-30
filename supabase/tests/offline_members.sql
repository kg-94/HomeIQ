-- Offline members: who can add them, using them everywhere, and linking to an account. Run: npm run test:db
begin;
create extension if not exists pgtap with schema extensions;
create temp table tap (at timestamptz default clock_timestamp(), line text);
grant all on tap to authenticated, anon;
insert into tap (line) select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@rls.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@rls.test'),
  ('00000000-0000-0000-0000-00000000000c', 'c@rls.test'),
  ('00000000-0000-0000-0000-00000000000d', 'd@rls.test');

create function pg_temp.act_as(uid uuid, email text default '') returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'email', email, 'role', 'authenticated')::text, true);
$$;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select public.create_household('A home', 'Alice');
select public.create_household('Solo home', 'Alice');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select public.create_household('C home', 'Carol');
reset role;
insert into household_members (household_id, user_id, display_name)
  select id, '00000000-0000-0000-0000-00000000000b', 'Bob' from households where name = 'A home';
create temp table hh as select id, name from households where name in ('A home', 'Solo home', 'C home');
grant select on hh to authenticated;
create function pg_temp.h(n text) returns uuid language sql as $$ select id from hh where name = n $$;
create temp table om (id uuid);
grant all on om to authenticated;

-- Who can add
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into om select add_offline_member(pg_temp.h('A home'), 'Maa');
insert into tap (line) select is(
  (select count(*) from household_members where household_id = pg_temp.h('A home') and is_offline), 1::bigint, 'owner can add an offline member');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into tap (line) select throws_ok(format('select add_offline_member(%L, %L)', pg_temp.h('A home'), 'x'), 'P0001', null, 'plain member cannot add offline members');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
insert into tap (line) select throws_ok(format('select add_offline_member(%L, %L)', pg_temp.h('A home'), 'x'), 'P0001', null, 'another household cannot add members to yours');

-- Using an offline member (as A)
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into tap (line) select lives_ok(format(
  $q$do $d$ begin perform save_expense(null, %L, 'Milk', 300, %L, current_date, null,
     '[{"user_id":"00000000-0000-0000-0000-00000000000a","share":150},{"user_id":"%s","share":150}]');
     set constraints all immediate; set constraints all deferred; end $d$$q$,
  pg_temp.h('A home'), (select id from om), (select id from om)), 'offline member can pay and share an expense');
insert into tap (line) select is(
  (select balance from member_balances where user_id = (select id from om)), 150.00, 'offline member has a balance');
insert into tap (line) select lives_ok(format(
  $q$insert into tasks (household_id, title, due_date, assignee_id) values (%L, 'Buy medicines', current_date, %L)$q$,
  pg_temp.h('A home'), (select id from om)), 'offline member can be assigned a task');
insert into tap (line) select lives_ok(format(
  $q$insert into incomes (household_id, description, amount, received_on, received_by) values (%L, 'Pension', 20000, current_date, %L)$q$,
  pg_temp.h('A home'), (select id from om)), 'offline member can receive shared income');
insert into tap (line) select throws_ok(format(
  $q$insert into incomes (household_id, description, amount, received_on, received_by, is_private) values (%L, 'x', 1, current_date, %L, true)$q$,
  pg_temp.h('A home'), (select id from om)), '42501', null, 'offline member income cannot be private');
insert into settlements (household_id, from_user, to_user, amount, settled_on)
  values (pg_temp.h('A home'), '00000000-0000-0000-0000-00000000000a', (select id from om), 50, current_date);

-- Link to a real account: D accepts an invite made for Maa
insert into household_invites (household_id, email, member_id) values (pg_temp.h('A home'), 'd@rls.test', (select id from om));
reset role;
create temp table inv as select token from household_invites where email = 'd@rls.test';
grant select on inv to authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d', 'd@rls.test');
insert into tap (line) select lives_ok(format('select accept_invite(%L, %L)', (select token from inv), 'Maa (Devi)'), 'invitee can take over the offline member');
reset role;
insert into tap (line) select results_eq(
  format($q$select user_id::text, is_offline, display_name from household_members where household_id = %L and user_id in (%L, '00000000-0000-0000-0000-00000000000d')$q$,
    pg_temp.h('A home'), (select id from om)),
  $$ values ('00000000-0000-0000-0000-00000000000d', false, 'Maa (Devi)') $$, 'membership now belongs to the account');
insert into tap (line) select is(
  (select count(*) from (
     select 1 from expenses where paid_by = '00000000-0000-0000-0000-00000000000d'
     union all select 1 from expense_splits where user_id = '00000000-0000-0000-0000-00000000000d'
     union all select 1 from tasks where assignee_id = '00000000-0000-0000-0000-00000000000d'
     union all select 1 from incomes where received_by = '00000000-0000-0000-0000-00000000000d'
     union all select 1 from settlements where to_user = '00000000-0000-0000-0000-00000000000d') x), 5::bigint,
  'expense, split, task, income and settlement all moved to the account');
insert into tap (line) select is(
  (select balance from member_balances where user_id = '00000000-0000-0000-0000-00000000000d'), 100.00, 'balance carried over');

-- Deleting: offline members don't count as "other members"
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select add_offline_member(pg_temp.h('Solo home'), 'Kid');
with d as (delete from households where id = pg_temp.h('Solo home') returning 1)
insert into tap (line) select is(count(*), 1::bigint, 'sole account holder can delete a household with offline members') from d;
with d as (delete from households where id = pg_temp.h('A home') returning 1)
insert into tap (line) select is(count(*), 0::bigint, 'still cannot delete when another account is a member') from d;

insert into tap (line) select * from finish();
select line from tap order by at;
rollback;
