-- READ ONLY. Run against the EXISTING LearnBoard Database.
-- Returns ONE row containing all catalog results, so SQL Editor can export it.
-- No DDL, no writes, no calls to application RPCs.
begin transaction read only;

select jsonb_build_object(
  'table_security', coalesce((select jsonb_agg(to_jsonb(catalog_row)) from (
select c.relname as table_name, c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' order by c.relname
  ) catalog_row), '[]'::jsonb),
  'columns', coalesce((select jsonb_agg(to_jsonb(catalog_row)) from (
select table_name,column_name,data_type,udt_name,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name in
 ('learning_boards','learning_board_games','assignments',
  'learning_board_group_assignments','attempts','scorm_runtime_data','game_score_events')
order by table_name,ordinal_position
  ) catalog_row), '[]'::jsonb),
  'constraints', coalesce((select jsonb_agg(to_jsonb(catalog_row)) from (
select conrelid::regclass as table_name,conname,pg_get_constraintdef(oid) as definition
from pg_constraint where connamespace='public'::regnamespace order by 1,2
  ) catalog_row), '[]'::jsonb),
  'indexes', coalesce((select jsonb_agg(to_jsonb(catalog_row)) from (
select tablename,indexname,indexdef from pg_indexes
where schemaname='public' order by 1,2
  ) catalog_row), '[]'::jsonb),
  'policies', coalesce((select jsonb_agg(to_jsonb(catalog_row)) from (
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname in ('public','storage') order by 1,2,3
  ) catalog_row), '[]'::jsonb),
  'table_grants', coalesce((select jsonb_agg(to_jsonb(catalog_row)) from (
select table_name,grantee,privilege_type from information_schema.table_privileges
where table_schema='public' and grantee in ('PUBLIC','anon','authenticated','service_role')
order by 1,2,3
  ) catalog_row), '[]'::jsonb),
  'column_grants', coalesce((select jsonb_agg(to_jsonb(catalog_row)) from (
select table_name,column_name,grantee,privilege_type
from information_schema.column_privileges
where table_schema='public' and grantee in ('PUBLIC','anon','authenticated','service_role')
order by 1,2,3,4
  ) catalog_row), '[]'::jsonb),
  'functions', coalesce((select jsonb_agg(to_jsonb(catalog_row)) from (
select p.oid::regprocedure as function_name,p.prosecdef as security_definer,
  p.proacl as grants,pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind='f' order by 1
  ) catalog_row), '[]'::jsonb),
  'triggers', coalesce((select jsonb_agg(to_jsonb(catalog_row)) from (
select c.oid::regclass as table_name,t.tgname,
  pg_get_triggerdef(t.oid) as trigger_definition,
  pg_get_functiondef(t.tgfoid) as trigger_function
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','auth') and not t.tgisinternal order by 1,2
  ) catalog_row), '[]'::jsonb),
  'storage_buckets', coalesce((select jsonb_agg(to_jsonb(catalog_row)) from (
select id,public from storage.buckets where id='scorm-packages'
  ) catalog_row), '[]'::jsonb)
) as learnboard_catalog;

commit;
