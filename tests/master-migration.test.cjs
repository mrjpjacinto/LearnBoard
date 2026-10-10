const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
let PGlite;
try { ({PGlite}=require(process.env.LEARNBOARD_PGLITE_MODULE || path.join(os.tmpdir(),'learnboard-lms-verification/node_modules/@electric-sql/pglite'))); } catch {};
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const baseline=require('./catalog-database.cjs');

test('reviewed Master migration preserves entitlement/history and rejects cross-school access',{skip:!PGlite && 'Optional isolated PostgreSQL test engine is unavailable'},async()=>{
 const db=new PGlite();try{
 await baseline(db);
 // Seed before migration, preserving an existing school path and profile IDs.
 await db.exec(`insert into schools(id,name,is_active) values('${id(1)}','School A',true),('${id(2)}','School B',true);
 insert into auth.users(id) values('${id(10)}'),('${id(11)}'),('${id(12)}'),('${id(13)}'),('${id(14)}');
 delete from profiles where id in ('${id(10)}','${id(11)}','${id(12)}','${id(13)}','${id(14)}');
 insert into profiles(id,role,school_id,is_active) values('${id(10)}','super_admin',null,true),('${id(11)}','admin','${id(1)}',true),('${id(12)}','admin','${id(2)}',true),('${id(13)}','student','${id(1)}',true),('${id(14)}','student','${id(2)}',true);
 insert into learning_boards(id,name,school_id) values('${id(20)}','Existing School Path','${id(1)}');
 insert into games(id,name,status,launch_file,package_path) values('${id(30)}','Game A','published','index.html','package-a'),('${id(31)}','Game B','published','index.html','package-b');
 insert into scorm_packages(id,game_id,file_name,storage_path,processing_status,scorm_version,launch_file,extraction_path) values('${id(40)}','${id(30)}','a.zip','a.zip','ready','1.2','index.html','package-a'),('${id(41)}','${id(31)}','b.zip','b.zip','ready','1.2','index.html','package-b');`);
 await db.exec(fs.readFileSync('database/proposals/003_master_paths_complete_lms.sql','utf8'));
 assert.equal((await db.query('select count(*)::int n from profiles')).rows[0].n,5);
 const query=(q,p=[])=>db.query(q,p),actor=async(user,role='authenticated')=>{await db.exec('reset role');await query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role '+role);};
 await query("insert into learning_boards(id,name,school_id) values($1,'Master',null)",[id(21)]);
 await actor(id(10));let stamp=(await query('select updated_at from learning_boards where id=$1',[id(21)])).rows[0].updated_at;
 await query('select learnboard_save_path_games($1,$2,$3)',[id(21),[id(30),id(31)],stamp]);
 await db.exec('reset role');await query('select learnboard_set_path_schools($1,$2,$3)',[id(10),id(21),[id(1)]]);
 await actor(id(11));assert.equal((await query('select id from learning_boards where id=$1',[id(21)])).rows.length,1);
 await assert.rejects(query('select learnboard_save_path_games($1,$2,now())',[id(21),[id(30)]]),/not available/);
 await actor(id(12));assert.equal((await query('select id from learning_boards where id=$1',[id(21)])).rows.length,0);
 await db.exec('reset role');
 const copy=(await query('select learnboard_customize_path($1,$2,$3,$4) id',[id(11),id(21),id(1),'School Copy'])).rows[0].id;
 assert.equal((await query('select count(*)::int n from games')).rows[0].n,2);assert.equal((await query('select count(*)::int n from scorm_packages')).rows[0].n,2);
 assert.equal((await query('select count(*)::int n from learning_board_games where board_id=$1',[copy])).rows[0].n,2);
 const config={status:'active',available_from:null,available_until:null,max_attempts:3,time_limit_minutes:null,passing_score:70,allow_resume:true,score_visible:false};
 await assert.rejects(query('select learnboard_assign_students($1,$2,$3,$4)',[id(11),id(21),[id(13),id(14)],config]),/target/);
 assert.equal((await query('select count(*)::int n from assignments')).rows[0].n,0);
 // Scheduling is enforced in SQL, including direct launch calls.
 const future={...config,status:'scheduled',available_from:'2099-01-01T09:00:00Z'};
 const upcoming=(await query('select learnboard_assign_students($1,$2,$3,$4) ids',[id(11),copy,[id(13)],future])).rows[0].ids[0];
 await actor(id(13));await assert.rejects(query('select learnboard_start_attempt($1,$2)',[upcoming,id(30)]),/currently available/);await db.exec('reset role');
 await query("insert into groups(id,name,school_id,is_active) values($1,'Class A',$2,true)",[id(50),id(1)]);
 await query('insert into group_members(group_id,user_id) values($1,$2)',[id(50),id(13)]);
 const classId=(await query("select learnboard_save_assignment($1,'class',null,$2,null,$3,$4) id",[id(11),id(21),id(50),config])).rows[0].id;
 await actor(id(14));await assert.rejects(query('select learnboard_resolve_class_assignment($1)',[classId]),/not available/);
 await actor(id(13));const classStudent=(await query('select learnboard_resolve_class_assignment($1) id',[classId])).rows[0].id;
 await db.exec('reset role');
 const assignment=(await query('select learnboard_assign_students($1,$2,$3,$4) ids',[id(11),id(21),[id(13)],config])).rows[0].ids[0];
 await actor(id(13));await assert.rejects(query('select learnboard_start_attempt($1,$2)',[assignment,id(31)]),/earlier/);
 const first=(await query('select * from learnboard_start_attempt($1,$2)',[assignment,id(30)])).rows[0];
 const resumed=(await query('select * from learnboard_start_attempt($1,$2)',[assignment,id(30)])).rows[0];assert.equal(first.id,resumed.id);
 await assert.rejects(query('select score from attempts'),/permission denied/);
 await assert.rejects(query('truncate game_score_events'),/permission denied/);
 await db.exec('reset role');
 await query("select learnboard_commit_runtime($1,$2,$3,'{}',90,'completed','passed',10,true)",[id(13),first.id,resumed.launch_config.session_token]);
 await query('select learnboard_set_path_schools($1,$2,$3)',[id(10),id(21),[]]);
 await query("update learning_boards set status='archived' where id=$1",[id(21)]);
 await assert.rejects(query('select learnboard_assign_students($1,$2,$3,$4)',[id(11),id(21),[id(13)],config]),/not available/);
 assert.equal(Number((await query('select score from attempts where id=$1',[first.id])).rows[0].score),90);
 await assert.rejects(query('delete from learning_boards where id=$1',[id(21)]),/foreign key|has assignments/);
 await assert.rejects(query('delete from assignments where id=$1',[assignment]),/retained/);
 await actor(id(13));const second=(await query('select * from learnboard_start_attempt($1,$2)',[assignment,id(31)])).rows[0];assert.ok(second.id);
 // Archival/withdrawal preserve a class entitlement too.
 await query('select * from learnboard_start_attempt($1,$2)',[classStudent,id(30)]);
 await db.exec('reset role');
 await query("update learning_board_group_assignments set available_from='2099-01-01' where id=$1",[classId]);
 await actor(id(13));await assert.rejects(query('select learnboard_start_attempt($1,$2)',[classStudent,id(30)]),/currently available/);
 await db.exec('reset role');
 await query("update assignments set available_until='2000-01-01' where id=$1",[assignment]);
 await actor(id(13));await assert.rejects(query('select learnboard_start_attempt($1,$2)',[assignment,id(30)]),/currently available/);
 await actor(id(14));await assert.rejects(query('select learnboard_start_attempt($1,$2)',[assignment,id(30)]),/not available/);
 }finally{await db.close();}
});
