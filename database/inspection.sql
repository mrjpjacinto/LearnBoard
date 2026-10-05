-- LearnBoard Database: read-only catalog inspection. No changes are applied.
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint where connamespace = 'public'::regnamespace order by 1,2;
select schemaname, tablename, indexname, indexdef from pg_indexes
where schemaname = 'public' order by tablename,indexname;
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname in ('public','storage') order by schemaname,tablename,policyname;
select c.oid::regclass as table_name, t.tgname, pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','auth') and not t.tgisinternal order by 1,2;
select p.oid::regprocedure as function_name, p.prosecdef as security_definer,
  p.proacl as privileges, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind='f'
  and (p.proname like 'learnboard_%' or p.proname in
    ('is_admin','is_super_admin','is_school_admin','current_school_id','current_user_role','is_same_school','current_user_active_status'));
