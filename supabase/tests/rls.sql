-- Household isolation. Run: npm run test:db (or `npx supabase test db` with Docker).
-- Everything runs in one transaction and is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
-- TAP lines are collected and emitted by one final select, so this also
-- runs via `supabase db query`, which only returns the last result.
create temp table tap (at timestamptz default clock_timestamp(), line text);
grant all on tap to authenticated, anon;
insert into tap (line) select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@rls.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@rls.test'),
  ('00000000-0000-0000-0000-00000000000c', 'c@rls.test');

create function pg_temp.act_as(uid uuid, email text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'email', email, 'role', 'authenticated')::text, true);
$$;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a', 'a@rls.test');
select public.create_household('A home', 'Alice');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b', 'b@rls.test');
select public.create_household('B home', 'Bob');

-- As A
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a', 'a@rls.test');
insert into tap (line) select results_eq($$ select name from households $$, $$ values ('A home') $$, 'A sees only own household');
insert into tap (line) select is((select count(*) from household_members), 1::bigint, 'A sees only own members');
insert into tap (line) select is((select role from household_members), 'owner', 'creator is owner');

with u as (update households set name = 'hacked' where name = 'B home' returning 1)
insert into tap (line) select is(count(*), 0::bigint, 'A cannot update B household') from u;

insert into tap (line) select throws_ok(
  $$ insert into household_members (household_id, user_id, display_name)
     values ((select id from households limit 1), '00000000-0000-0000-0000-00000000000c', 'x') $$,
  '42501', null, 'members cannot be inserted directly');

insert into tap (line) select throws_ok(
  $$ update household_members set role = 'member' $$,
  '42501', null, 'role is not directly updatable');

insert into tap (line) select throws_ok(
  $$ delete from household_members where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  'P0001', 'A household needs at least one owner', 'last owner cannot leave');

insert into tap (line) select lives_ok(
  $$ insert into household_invites (household_id, email) select id, 'b@rls.test' from households $$,
  'owner can invite');

reset role;
create temp table invite as select token from household_invites;
grant select on invite to authenticated;

-- As C: cannot redeem an invite addressed to B
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c', 'c@rls.test');
insert into tap (line) select is((select count(*) from household_invites), 0::bigint, 'non-member cannot read invites');
insert into tap (line) select throws_ok(
  format('select accept_invite(%L, %L)', (select token from invite), 'Carol'),
  'P0001', null, 'invite cannot be redeemed by other email');

-- As B: redeems own invite, becomes a plain member of A home
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b', 'b@rls.test');
insert into tap (line) select lives_ok(format('select accept_invite(%L, %L)', (select token from invite), 'Bob'), 'invitee can accept');
insert into tap (line) select is((select count(*) from households), 2::bigint, 'B now sees both households');

with d as (delete from households where name = 'A home' returning 1)
insert into tap (line) select is(count(*), 0::bigint, 'member cannot delete household') from d;

-- Anonymous
reset role;
set local role anon;
insert into tap (line) select is((select count(*) from households), 0::bigint, 'anon sees nothing');

insert into tap (line) select * from finish();
select line from tap order by at;
rollback;
