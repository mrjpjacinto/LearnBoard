const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
let PGlite;try{({PGlite}=require(process.env.LEARNBOARD_PGLITE_MODULE||path.join(os.tmpdir(),'lumentrail-sql-validation/node_modules/@electric-sql/pglite')))}catch{}
const baseline=require('./catalog-database.cjs'),id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
test('editable paths add, remove and reorder without deleting student history, with tenant and concurrency checks',{skip:!PGlite},async()=>{
 const db=new PGlite();try{
 await baseline(db);await db.exec(fs.readFileSync('database/proposals/004_prelaunch_security.sql','utf8'));await db.exec(fs.readFileSync('database/proposals/008_editable_learning_paths.sql','utf8'));
 await db.query("insert into schools(id,name,is_active) values($1,'A',true),($2,'B',true)",[id(1),id(2)]);
 for(const [n,role,school] of [[10,'super_admin',null],[11,'admin',id(1)],[12,'admin',id(2)],[13,'student',id(1)]]){await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[id(n),{role}]);await db.query('update profiles set role=$2,school_id=$3 where id=$1',[id(n),role,school]);}
 await db.query("insert into learning_boards(id,name,school_id) values($1,'Assigned',$2),($3,'Unassigned',$2)",[id(20),id(1),id(21)]);
 await db.query("insert into games(id,name) values($1,'First'),($2,'Second'),($3,'Third')",[id(30),id(31),id(32)]);
 await db.query('insert into learning_board_games(board_id,game_id,sort_order) values($1,$2,0),($1,$3,1)',[id(20),id(30),id(31)]);
 await db.query('insert into assignments(id,board_id,student_id,school_id) values($1,$2,$3,$4)',[id(40),id(20),id(13),id(1)]);
 await db.query('insert into attempts(id,assignment_id,student_id,game_id,score) values($1,$2,$3,$4,80)',[id(50),id(40),id(13),id(30)]);
 const oldLinks=(await db.query('select id,game_id,sort_order from learning_board_games where board_id=$1 order by sort_order',[id(20)])).rows;
 const version=async(board)=>{const role=(await db.query('select current_user as role')).rows[0].role;await db.exec('reset role');const token=(await db.query('select updated_at::text version from learning_boards where id=$1',[board])).rows[0].version;if(role==='authenticated')await db.exec('set role authenticated');return token;};
 const actor=async(user)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(user)]);await db.exec('set role authenticated');};
 const save=async(board,ids,expected=undefined)=>{const token=expected??await version(board);return db.query('select learnboard_save_path_games($1,$2,$3)',[board,ids,token]);};
 const oldVersion=await version(id(20));await actor(11);await save(id(20),[id(30),id(31),id(32)],oldVersion);
 await db.exec('reset role');const after=(await db.query('select id,game_id,sort_order from learning_board_games where board_id=$1 order by sort_order',[id(20)])).rows;
 assert.deepEqual(after.slice(0,2),oldLinks);assert.equal(after[2].game_id,id(32));assert.equal(Number((await db.query('select score from attempts where id=$1',[id(50)])).rows[0].score),80);
 await actor(11);await assert.rejects(save(id(20),[id(30),id(31),id(32)],oldVersion),/changed/);
 await save(id(20),[id(31),id(30),id(32)]);await save(id(20),[id(31),id(32)]);
 await db.exec('reset role'); assert.equal(Number((await db.query('select score from attempts where id=$1',[id(50)])).rows[0].score),80);assert.equal((await db.query('select count(*)::int n from learning_board_games where board_id=$1 and game_id=$2',[id(20),id(30)])).rows[0].n,0);
 const token=id(60); await db.query("update attempts set launch_config=jsonb_build_object('session_token',$2::text) where id=$1",[id(50),token]);
 await db.query('select lumentrail_remove_path_student($1,$2,$3)',[id(11),id(20),id(40)]);assert.equal((await db.query('select status from assignments where id=$1',[id(40)])).rows[0].status,'cancelled');assert.equal((await db.query('select count(*)::int n from attempts where id=$1',[id(50)])).rows[0].n,1);
 await db.query("select learnboard_commit_runtime($1,$2,$3,'{}'::jsonb,85,'completed','passed',10,true)",[id(13),id(50),token]);assert.equal(Number((await db.query('select score from attempts where id=$1',[id(50)])).rows[0].score),85);
 await actor(13);await assert.rejects(db.query('select learnboard_start_attempt($1,$2)',[id(40),id(31)]),/available/);await db.exec('reset role');
 await assert.rejects(db.query('select lumentrail_remove_path_student($1,$2,$3)',[id(12),id(20),id(40)]),/denied/);await actor(11);
 await assert.rejects(save(id(20),[id(30),id(31),id(32),id(32)]),/valid, unique/);
 await actor(12);await assert.rejects(db.query('select learnboard_save_path_games($1,$2,$3)',[id(20),[id(30)],await (async()=>{await db.exec('reset role');const token=await version(id(20));await actor(12);return token;})()]),/not available/);
 await actor(11);await save(id(20),[]);await db.exec('reset role');
 const config={available_from:null,available_until:null,max_attempts:null,time_limit_minutes:null,passing_score:70,allow_resume:true,status:'active'};
 await db.query("select learnboard_save_assignment($1,'student',$2,$3,null,$4,$5)",[id(11),id(40),id(20),id(13),config]);
 assert.equal((await db.query('select status from assignments where id=$1',[id(40)])).rows[0].status,'active');assert.equal(Number((await db.query('select score from attempts where id=$1',[id(50)])).rows[0].score),85);
 await actor(10);await save(id(21),[id(32),id(30)]);await save(id(21),[id(30)]);
 await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from learning_board_games where board_id=$1',[id(21)])).rows[0].n,1);
 }finally{await db.close();}
});

test('editable migration accepts the previously prepared append-only function',{skip:!PGlite},async()=>{const db=new PGlite();try{await baseline(db);await db.exec(fs.readFileSync('database/proposals/004_prelaunch_security.sql','utf8'));await db.exec(fs.readFileSync('database/proposals/007_assigned_path_game_append.sql','utf8'));await db.exec(fs.readFileSync('database/proposals/008_editable_learning_paths.sql','utf8'));}finally{await db.close();}});

test('editable migration normalizes Windows CRLF in both reviewed definitions and live definitions',{skip:!PGlite},async()=>{const db=new PGlite();try{await baseline(db);await db.exec(fs.readFileSync('database/proposals/008_editable_learning_paths.sql','utf8').replace(/\r?\n/g,'\r\n'));}finally{await db.close();}});

test('editable migration still rejects changes to reviewed function logic',{skip:!PGlite},async()=>{const db=new PGlite();try{await baseline(db);const catalog=require('../database/reviews/master_paths_catalog.json');const fn=catalog.functions.find(f=>f.definition.includes('FUNCTION public.learnboard_save_path_games(')).definition.replace('cardinality(p_games)>200','cardinality(p_games)>201');await db.exec(fn);await assert.rejects(db.exec(fs.readFileSync('database/proposals/008_editable_learning_paths.sql','utf8')),/differs from reviewed catalog/);}finally{await db.close();}});
