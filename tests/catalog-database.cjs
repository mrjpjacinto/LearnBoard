const c=require('../database/reviews/master_paths_catalog.json'),fixture=require('./fixtures/supabase-schema.json');
async function baseline(db){
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema storage;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
 create table storage.buckets(id text primary key,public boolean); create table storage.objects(id uuid,bucket_id text);`);
 for(const table of c.table_security){
  const columns=c.columns.filter(x=>x.table_name===table.table_name);
  const defs=columns.length?columns.map(x=>`"${x.column_name}" ${x.udt_name}${x.column_default?' default '+x.column_default:''}${x.is_nullable==='NO'?' not null':''}`):Object.entries(fixture[table.table_name].properties).map(([name,m])=>{const type=m.format==='uuid'?'uuid':m.format?.includes('timestamp')?'timestamptz':m.format==='jsonb'?'jsonb':m.type==='boolean'?'boolean':m.type==='integer'?'integer':m.type==='number'?'numeric':'text';return `"${name}" ${type}${m.default===undefined?'':` default ${typeof m.default==='string'?(m.default.endsWith('()')?m.default:`'${m.default}'`):m.default}`}`;});
  await db.exec(`create table public.${table.table_name}(${defs.join(',')});`);
 }
 // Referenced PKs must precede FKs; import the ACTUAL exported constraints.
 for(const x of [...c.constraints].sort((a,b)=>Number(a.definition.startsWith('FOREIGN'))-Number(b.definition.startsWith('FOREIGN'))))await db.exec(`alter table public.${x.table_name} add constraint ${x.conname} ${x.definition};`);
 for(const f of c.functions)await db.exec(f.definition);
 for(const t of c.triggers)await db.exec(t.trigger_definition);
 for(const x of c.table_security)await db.exec(`alter table ${x.table_name} enable row level security;`);
 for(const p of c.policies.filter(p=>p.schemaname==='public'))await db.exec(`create policy "${p.policyname}" on public.${p.tablename} as ${p.permissive} for ${p.cmd} to ${p.roles.join(',')} ${p.qual?'using ('+p.qual+')':''} ${p.with_check?'with check ('+p.with_check+')':''};`);
 await db.exec('grant usage on schema public,auth,storage to anon,authenticated,service_role; grant all on all tables in schema public to anon,authenticated,service_role;');
 // Export contains actual separate indexes; unique constraints already create some.
 for(const x of c.indexes){const found=await db.query('select 1 from pg_indexes where indexname=$1',[x.indexname]);if(!found.rows.length)await db.exec(x.indexdef);}
}
module.exports=baseline;
