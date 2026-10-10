// Local PostgreSQL regression check. Pass an installed PGlite module path; no live DB access.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require(process.argv[2] || '@electric-sql/pglite');
const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
(async()=>{const db=new PGlite();try {
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table subjects(id uuid primary key,name text,is_active boolean default true);
 create table skills(id uuid primary key,subject_id uuid references subjects on delete cascade,name text,is_active boolean default true);
 create table games(id uuid primary key,name text,description text,image_path text,orientation_mode text default 'landscape',skill_id uuid references skills on delete set null,subject_id uuid references subjects on delete set null,updated_at timestamptz default now());
 create table attempts(id uuid primary key,game_id uuid references games on delete restrict,score int);
 insert into subjects(id,name) values ('${id(1)}','English'),('${id(2)}','Science'),('${id(3)}','Math');
 insert into skills(id,subject_id,name) values ('${id(11)}','${id(1)}','Spelling'),('${id(12)}','${id(1)}','Sentences'),('${id(13)}','${id(2)}','Animals'),('${id(14)}','${id(3)}','Division');
 insert into games(id,name,skill_id,subject_id,image_path) values ('${id(21)}','Existing game','${id(14)}','${id(3)}','unchanged.png');
 insert into attempts values ('${id(31)}','${id(21)}',90);`);
 await db.exec(fs.readFileSync('database/proposals/006_multiple_game_skills.sql','utf8'));
 const links=async()=> (await db.query('select skill_id from game_skills where game_id=$1 order by skill_id',[id(21)])).rows.map(row=>row.skill_id);
 assert.deepEqual(await links(),[id(14)]);
 const save=async(ids,values={})=>db.query('select * from lumentrail_save_game_skills($1,$2,$3)',[id(21),ids,values]);
 await save([id(11),id(12),id(13)],{name:'Combined game'});assert.deepEqual(await links(),[id(11),id(12),id(13)]);
 let game=(await db.query('select * from games where id=$1',[id(21)])).rows[0];assert.equal(game.skill_id,id(11));assert.equal(game.image_path,'unchanged.png');
 await assert.rejects(save([id(99)],{name:'Invalid overwrite'}));assert.equal((await db.query('select name from games')).rows[0].name,'Combined game');
 await assert.rejects(save([]));
 await save([id(13),id(11),id(13)]);assert.deepEqual(await links(),[id(11),id(13)]);
 await db.query('delete from subjects where id=$1',[id(1)]);assert.deepEqual(await links(),[id(13)]);game=(await db.query('select * from games')).rows[0];assert.equal(game.skill_id,id(13));assert.equal(game.subject_id,id(2));
 await db.query('delete from skills where id=$1',[id(13)]);assert.deepEqual(await links(),[]);game=(await db.query('select * from games')).rows[0];assert.equal(game.skill_id,null);assert.equal(game.subject_id,null);assert.equal(game.image_path,'unchanged.png');assert.equal((await db.query('select score from attempts')).rows[0].score,90);
 await save([id(14)]);await db.exec('set role authenticated;');await assert.rejects(db.query('select * from lumentrail_save_game_skills($1,$2,$3)',[id(21),[id(14)],{}]));await assert.rejects(db.query('insert into game_skills values($1,$2)',[id(21),id(14)]));await db.exec('reset role;');
 console.log('PASS: migration/backfill, cross-subject assignment, deduplication, atomic rollback, partial/last classification deletion, history preservation, and write permissions.');
 }finally{await db.close();}})().catch(error=>{console.error(error.message);process.exitCode=1;});
