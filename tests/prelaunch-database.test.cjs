const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
let PGlite;try{({PGlite}=require(process.env.LEARNBOARD_PGLITE_MODULE||path.join(os.tmpdir(),'learnboard-lms-verification/node_modules/@electric-sql/pglite')))}catch{}
const baseline=require('./catalog-database.cjs');const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
test('security-only proposal blocks metadata promotion, tenant bypass, dangerous grants and history deletion',{skip:!PGlite&&'Isolated PostgreSQL engine unavailable'},async()=>{
 const db=new PGlite();try{
 await baseline(db);
 await db.exec(fs.readFileSync('database/proposals/004_prelaunch_security.sql','utf8'));
 await db.query("insert into schools(id,name,is_active) values($1,'A',true),($2,'B',true)",[id(1),id(2)]);
 for(const [n,role,school] of [[10,'super_admin',null],[11,'admin',id(1)],[12,'admin',id(2)],[13,'student',id(1)],[14,'student',id(2)]]){
 await db.query("insert into auth.users(id,raw_user_meta_data) values($1,$2)",[id(n),{role:'super_admin'}]);
 assert.equal((await db.query('select role from profiles where id=$1',[id(n)])).rows[0].role,'student');
 await db.query('update profiles set role=$2,school_id=$3,is_active=true where id=$1',[id(n),role,school]);
 }
 await db.query("insert into groups(id,name,school_id) values($1,'A class',$2),($3,'B class',$4)",[id(20),id(1),id(21),id(2)]);
 await db.query('insert into group_members(group_id,user_id) values($1,$2),($3,$4)',[id(20),id(13),id(21),id(14)]);
 const actor=async user=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(user)]);await db.exec('set role authenticated');};
 await actor(11);
 assert.equal((await db.query('select id from profiles where id=$1',[id(14)])).rows.length,0);
 assert.equal((await db.query('select id from groups where id=$1',[id(21)])).rows.length,0);
 assert.equal((await db.query('select user_id from group_members where group_id=$1',[id(21)])).rows.length,0);
 await assert.rejects(db.query('insert into group_members(group_id,user_id) values($1,$2)',[id(21),id(13)]),/permission denied/);
 await assert.rejects(db.query('update profiles set school_id=$1 where id=$2',[id(2),id(11)]),/permission denied/);
 for(const table of ['profiles','attempts','game_score_events'])await assert.rejects(db.exec('truncate '+table),/permission denied/);
 await actor(13);await assert.rejects(db.exec('select * from scorm_runtime_data'),/permission denied/);await assert.rejects(db.exec('select * from game_score_events'),/permission denied/);
 await db.exec('reset role');await db.query('update schools set is_active=false where id=$1',[id(1)]);await actor(11);
 assert.equal((await db.query('select * from groups')).rows.length,0);
 await actor(10);assert.equal((await db.query('select * from groups')).rows.length,2);
 await db.exec('reset role');await db.query("insert into games(id,name) values($1,'History')",[id(30)]);
 await db.query('insert into assignments(id,student_id,school_id,game_id) values($1,$2,$3,$4)',[id(40),id(13),id(1),id(30)]);
 await db.query('insert into attempts(id,student_id,game_id,assignment_id) values($1,$2,$3,$4)',[id(50),id(13),id(30),id(40)]);
 await assert.rejects(db.query('delete from assignments where id=$1',[id(40)]),/foreign key/);
 await assert.rejects(db.query('delete from auth.users where id=$1',[id(13)]),/foreign key/);
 assert.equal((await db.query('select count(*)::int n from attempts')).rows[0].n,1);
 }finally{await db.close()}
});

test('signup guard accepts CRLF but rejects changed role logic',{skip:!PGlite&&'Isolated PostgreSQL engine unavailable'},async()=>{
const proposal=fs.readFileSync('database/proposals/004_prelaunch_security.sql','utf8');
for(const changed of [false,true]){const db=new PGlite();try{
await baseline(db);
let definition=(await db.query("select pg_get_functiondef('public.handle_new_user()'::regprocedure) as definition")).rows[0].definition;
const start=definition.indexOf('AS $function$')+'AS $function$'.length,end=definition.lastIndexOf('$function$');
const body=definition.slice(start,end).replace(/\r\n/g,'\n').replace(/\n/g,'\r\n');
definition=definition.slice(0,start)+body+definition.slice(end);
if(changed)definition=definition.replace("'student'","'admin'");
await db.exec(definition);
if(changed){await assert.rejects(db.exec(proposal),/Auth trigger function differs/);await db.exec('rollback');}
else await db.exec(proposal);
}finally{await db.close()}}
});
