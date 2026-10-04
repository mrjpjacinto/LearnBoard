const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os");
let PGlite;
try { ({PGlite}=require(process.env.LEARNBOARD_PGLITE_MODULE || path.join(os.tmpdir(),"learnboard-lms-verification/node_modules/@electric-sql/pglite"))); } catch {}
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,"0")}`;
test("proposed LMS SQL preserves authorization, ordering, limits, results and atomic user updates",{skip:!PGlite&&"Install the optional PostgreSQL test engine described in README.md"},async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema storage;
    create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
    create table storage.buckets(id text primary key,public boolean default false);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text);alter table storage.objects enable row level security;
    create policy test_existing_storage_access on storage.objects for all using(true) with check(true);`);
  const defs=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/supabase-schema.json"),"utf8"));
  for(const [name,def]of Object.entries(defs)){
    const columns=Object.entries(def.properties).map(([column,meta])=>{
      const type=meta.format==="uuid"?"uuid":meta.format?.includes("timestamp")?"timestamptz":meta.format==="jsonb"?"jsonb":meta.type==="boolean"?"boolean":meta.type==="integer"?"integer":meta.type==="number"?"numeric":"text";
      const d=meta.default===undefined?"":` default ${typeof meta.default==="string"?(meta.default.endsWith("()")?meta.default:`'${meta.default}'`):meta.default}`;
      return `"${column}" ${type}${d}${def.required?.includes(column)?" not null":""}${column==="id"?" primary key":""}`;
    });
    if(name==="group_members")columns.push("primary key(group_id,user_id)");
    await db.exec(`create table public.${name}(${columns.join(",")});`);
  }
  await db.exec("grant usage on schema public,auth,storage to anon,authenticated,service_role; grant all on all tables in schema public,storage to anon,authenticated,service_role;");
  await db.exec(fs.readFileSync("database/proposals/001_complete_lms.sql","utf8"));
  const sql=async(q,p=[])=>db.query(q,p);
  await sql("insert into schools(id,name) values($1,'School A'),($2,'School B')",[id(1),id(2)]);
  await sql("insert into profiles(id,full_name,role,school_id) values($1,'Admin','admin',$4),($2,'Student','student',$4),($3,'Other student','student',$5)",[id(10),id(11),id(12),id(1),id(2)]);
  await sql("insert into groups(id,name,school_id) values($1,'Class A',$3),($2,'Class B',$4)",[id(20),id(21),id(1),id(2)]);
  await sql("insert into group_members(group_id,user_id) values($1,$2)",[id(20),id(11)]);
  await sql("insert into learning_boards(id,name,school_id,updated_at) values($1,'Path',$2,'2026-01-01')",[id(30),id(1)]);
  for(const n of[40,41]){
   await sql("insert into games(id,name,status,package_path,launch_file) values($1,$2,'published',$3,'index.html')",[id(n),`Game ${n}`,`package-${n}`]);
   await sql("insert into scorm_packages(id,game_id,file_name,storage_path,processing_status,scorm_version,launch_file,extraction_path) values($1,$2,'game.zip','private.zip','ready','1.2','index.html',$3)",[id(n+10),id(n),`package-${n}`]);
  }
  const actor=async(user,role="authenticated")=>{await db.exec("reset role");await sql("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec(`set role ${role}`);};
  await actor(id(10));
  await sql("select learnboard_save_path_games($1,$2,$3)",[id(30),[id(40),id(41)],"2026-01-01"]);
  await assert.rejects(sql("select learnboard_save_path_games($1,$2,$3)",[id(30),[id(40)],"2026-01-01"]),/changed/);
  await db.exec("reset role");
  const config={available_from:null,available_until:null,max_attempts:1,time_limit_minutes:60,passing_score:70,allow_resume:true,status:"active"};
  const source=(await sql("select learnboard_save_assignment($1,'class',null,$2,null,$3,$4) id",[id(10),id(30),id(20),config])).rows[0].id;
  await assert.rejects(sql("select learnboard_save_assignment($1,'class',null,$2,null,$3,$4)",[id(10),id(30),id(21),config]),/target/);
  await actor(id(10));const stamp=(await sql("select updated_at from learning_boards where id=$1",[id(30)])).rows[0].updated_at;
  await assert.rejects(sql("select learnboard_save_path_games($1,$2,$3)",[id(30),[id(40)],stamp]),/assignments/);
  await actor(id(12));await assert.rejects(sql("select learnboard_resolve_class_assignment($1)",[source]),/not available/);
  await actor(id(11));const assignment=(await sql("select learnboard_resolve_class_assignment($1) id",[source])).rows[0].id;
  await assert.rejects(sql("select learnboard_start_attempt($1,$2)",[assignment,id(41)]),/earlier/);
  const first=(await sql("select * from learnboard_start_attempt($1,$2)",[assignment,id(40)])).rows[0];
  const resumed=(await sql("select * from learnboard_start_attempt($1,$2)",[assignment,id(40)])).rows[0];assert.equal(first.id,resumed.id);assert.notEqual(first.launch_config.session_token,resumed.launch_config.session_token);
  await assert.rejects(sql("insert into attempts(student_id,game_id) values($1,$2)",[id(11),id(40)]),/permission denied/);
  await assert.rejects(sql("select storage_path from scorm_packages"),/permission denied/);
  await assert.rejects(sql("select package_path from games"),/permission denied/);
  await actor(id(11),"service_role");
  const commit=(token,finish)=>sql("select learnboard_commit_runtime($1,$2,$3,$4,$5,$6,$7,$8,$9)",[id(11),first.id,token,{"cmi.core.lesson_status":"completed","cmi.core.score.raw":"80","cmi.core.score.max":"100"},80,"completed","passed",30,finish]);
  await assert.rejects(commit(first.launch_config.session_token,true),/no longer active/);
  await commit(resumed.launch_config.session_token,true);
  const stored=(await sql("select score,completion_status,status from attempts where id=$1",[first.id])).rows[0];assert.equal(Number(stored.score),80);assert.equal(stored.completion_status,"completed");assert.equal(stored.status,"completed");
  await actor(id(11));await assert.rejects(sql("select learnboard_start_attempt($1,$2)",[assignment,id(40)]),/limit reached/);
  const second=(await sql("select * from learnboard_start_attempt($1,$2)",[assignment,id(41)])).rows[0];
  await db.exec("reset role");await sql("delete from group_members where user_id=$1",[id(11)]);
  await assert.rejects(sql("select learnboard_commit_runtime($1,$2,$3,'{}',null,'incomplete','unknown',0,false)",[id(11),second.id,second.launch_config.session_token]),/Class assignment/);
  await sql("insert into group_members(group_id,user_id) values($1,$2)",[id(20),id(11)]);
  await assert.rejects(sql("select learnboard_update_user($1,$2,'Changed','student',true,$3,$4)",[id(10),id(11),id(1),[id(21)]]),/active classes/);
  assert.equal((await sql("select full_name from profiles where id=$1",[id(11)])).rows[0].full_name,"Student");assert.equal((await sql("select count(*) n from group_members where user_id=$1",[id(11)])).rows[0].n,1);
  await assert.rejects(sql("delete from games where id=$1",[id(40)]),/cannot be deleted/);
 }finally{await db.close();}
});
