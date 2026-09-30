-- Items, files and storage isolation. Run: npm run test:db
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

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select public.create_household('A home', 'Alice');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select public.create_household('B home', 'Bob');

reset role;
create temp table hh as select id, name from households;
grant select on hh to authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into items (household_id, name, warranty_expires_on)
  select id, 'Fridge', current_date + 200 from hh where name = 'A home';
insert into tap (line) select lives_ok(
  $$ insert into files (id, household_id, item_id, kind, name, mime, size, storage_path)
     select f.id, i.household_id, i.id, 'receipt', 'bill.pdf', 'application/pdf', 1000, i.household_id || '/' || f.id
     from items i, (select gen_random_uuid() as id) f $$,
  'member can attach a file to own item');
insert into tap (line) select throws_ok(
  $$ insert into files (household_id, kind, name, mime, size, storage_path)
     select id, 'photo', 'x.png', 'image/png', 1, id || '/somewhere-else' from hh where name = 'A home' $$,
  '23514', null, 'storage_path must be <household>/<file id>');
insert into tap (line) select throws_ok(
  $$ insert into files (id, household_id, kind, name, mime, size, storage_path, category)
     select f.id, h.id, 'document', 'x.pdf', 'application/pdf', 1, h.id || '/' || f.id, 'bogus'
     from hh h, (select gen_random_uuid() as id) f where h.name = 'A home' $$,
  '23514', null, 'document category must be known');
insert into tap (line) select lives_ok(
  $$ insert into storage.objects (bucket_id, name) select 'household-files', id || '/obj' from hh where name = 'A home' $$,
  'member can upload under own household folder');

reset role;
create temp table it as select id from items;
grant select on it to authenticated;

-- As B
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into tap (line) select is((select count(*) from items), 0::bigint, 'B cannot see A items');
insert into tap (line) select is((select count(*) from files), 0::bigint, 'B cannot see A files');
insert into tap (line) select is(
  (select count(*) from storage.objects where bucket_id = 'household-files'), 0::bigint, 'B cannot see A storage objects');
insert into tap (line) select throws_ok(
  $$ insert into storage.objects (bucket_id, name) select 'household-files', id || '/evil' from hh where name = 'A home' $$,
  '42501', null, 'B cannot upload into A folder');
insert into tap (line) select throws_ok(
  $$ insert into tasks (household_id, title, due_date, item_id)
     select (select id from hh where name = 'B home'), 'x', current_date, (select id from it) $$,
  '23503', null, 'task cannot link another household item');

-- As A: deleting an item unlinks tasks and removes file rows
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into tasks (household_id, title, due_date, item_id)
  select household_id, 'Service fridge', current_date, id from items;
delete from items;
insert into tap (line) select ok((select item_id from tasks where title = 'Service fridge') is null, 'item delete unlinks its tasks');
insert into tap (line) select is((select count(*) from files), 0::bigint, 'item delete removes its file rows');

insert into tap (line) select * from finish();
select line from tap order by at;
rollback;
