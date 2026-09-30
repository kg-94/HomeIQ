-- Avatar storage: users write only their own folder. Run: npm run test:db
begin;
create extension if not exists pgtap with schema extensions;
create temp table tap (at timestamptz default clock_timestamp(), line text);
grant all on tap to authenticated, anon;
insert into tap (line) select plan(3);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@rls.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@rls.test');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into tap (line) select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-00000000000a/me.webp') $$,
  'user can upload into their own avatar folder');
insert into tap (line) select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-00000000000b/evil.webp') $$,
  '42501', null, 'user cannot upload into someone else''s folder');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into tap (line) select is(
  (select count(*) from storage.objects where bucket_id = 'avatars'), 0::bigint, 'others cannot list your avatar objects');
-- (Deletes can't be tested in SQL: Supabase blocks direct deletes from storage tables.)

insert into tap (line) select * from finish();
select line from tap order by at;
rollback;
