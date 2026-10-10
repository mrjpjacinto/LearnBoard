const test=require('node:test'),assert=require('node:assert/strict'),mock=require('./mock-module.cjs'),load=require('./load-typescript.cjs');
test('authorized quiz details use saved interactions when event rows are absent and omit raw data',async()=>{
 const reads=[];const raw={'cmi.interactions.0.id':'q','cmi.interactions.0.result':'correct','cmi.suspend_data':'private'};
 const admin={from(table){const filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},in(k,v){filters[k]=v;return q},order(){return q},range(){return q},maybeSingle(){return q},then(resolve){reads.push({table,filters});return Promise.resolve({data:table==='attempts'?{id:'attempt',student_id:'student',game_id:'game',assignment_id:'assignment'}:table==='profiles'?{school_id:'a',role:'student'}:table==='assignments'?{school_id:'a',student_id:'student'}:table==='game_score_events'?[]:[{attempt_id:'attempt',raw_data:raw,updated_at:'saved'}],error:null}).then(resolve)}};return q}};
 const {reportAttempt}=mock('lib/lms/reports.ts',{'./auth':{authorize:async()=>({admin,profile:{role:'admin',school_id:'a'}}),uuid:v=>v,assertSchool:(p,s)=>assert.equal(p.school_id,s),checkDb:e=>{if(e)throw e}},'./query':{readAll:async q=>(await q).data},'./quiz-results':load('lib/lms/quiz-results.ts')});
 const report=await reportAttempt('attempt');assert.equal(report.correct,1);assert.equal(report.events.length,1);assert.equal(JSON.stringify(report).includes('private'),false);
 assert.deepEqual(reads.find(r=>r.table==='scorm_runtime_data').filters.attempt_id,['attempt']);
});
