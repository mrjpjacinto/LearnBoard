const test=require('node:test'),assert=require('node:assert/strict'),mock=require('./mock-module.cjs');
const helpers=mock('lib/lms/game-skills.ts',{});
const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
test('multiple skills accept cross-subject IDs, deduplicate and reject empty or malformed input',()=>{
 const form=new FormData();form.append('skill_ids',id(1));form.append('skill_ids',id(2));form.append('skill_ids',id(1));assert.deepEqual(helpers.parseSkillIds(form,'skillId'),[id(1),id(2)]);
 assert.throws(()=>helpers.parseSkillIds(new FormData(),'skillId'));form.append('skill_ids','bad');assert.throws(()=>helpers.parseSkillIds(form,'skillId'));
});
test('empty associations stay unassigned even if legacy columns contain stale values',()=>{
 const game={skill_id:id(1),subject_id:id(2),skill_ids:[],subject_ids:[]};assert.deepEqual(helpers.gameSkillIds(game),[]);assert.equal(helpers.hasGameSubject(game,id(2)),false);
});
class LmsError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const server=mock('lib/lms/game-skills-server.ts',{'./auth':{LmsError,checkDb:error=>{if(error)throw new Error(error.message)}}});
function database(games,links,skills,error=null){return {from(table){const q={select(){return q},in(){return q},eq(){return q},order(){return q},range(){return q},limit(){return q},then(resolve){return Promise.resolve({data:table==='games'?games:table==='game_skills'?links:skills,error:table==='game_skills'?error:null}).then(resolve)}};return q;}};}
test('a game appears in all linked subjects and deletion counts unique games and only newly unassigned games',async()=>{
 const games=[{id:id(21),skill_id:id(11),subject_id:id(1)},{id:id(22),skill_id:id(12),subject_id:id(1)}];
 const links=[{game_id:id(21),skill_id:id(11),skills:{subject_id:id(1)}},{game_id:id(21),skill_id:id(13),skills:{subject_id:id(2)}},{game_id:id(22),skill_id:id(12),skills:{subject_id:id(1)}}];
 const db=database(games,links,[{id:id(11)},{id:id(12)}]);const classified=await server.loadGameClassifications(db,games);assert.deepEqual(classified[0].subject_ids,[id(1),id(2)]);assert.equal(helpers.hasGameSkill(classified[0],id(13)),true);
 assert.deepEqual(await server.classificationImpact(db,'subjects',id(1)),{count:2,unassigned:1});assert.deepEqual(await server.classificationImpact(db,'skills',id(11)),{count:1,unassigned:0});
});
test('pre-migration reads use legacy data but other database errors do not silently fall back',async()=>{
 const games=[{id:id(21),skill_id:id(11),subject_id:id(1)}];const result=await server.loadGameClassifications(database(games,[],[],{code:'PGRST205'}),games);assert.deepEqual(result[0].skill_ids,[id(11)]);
 await assert.rejects(server.loadGameClassifications(database(games,[],[],{code:'42501',message:'Denied'}),games));
});
