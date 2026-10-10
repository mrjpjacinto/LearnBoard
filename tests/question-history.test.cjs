const test=require('node:test'),assert=require('node:assert/strict');const {questionHistory}=require('./load-typescript.cjs')('lib/scorm/question-history.ts');
test('attempt numbers reset per question and durations are differences between answers',()=>{
 const raw={};for(const [i,q,result,time] of [[0,1,'correct',20],[1,2,'incorrect',35],[2,2,'correct',42]]){const p='cmi.interactions.'+i+'.';raw[p+'id']=String(q);raw[p+'result']=result;raw[p+'lumentrail_elapsed']=String(time);}
 assert.deepEqual(questionHistory(raw).map(r=>[r.question,r.attempt,r.result,r.speed]),[['1',1,'Correct','20 sec'],['2',1,'Incorrect','15 sec'],['2',2,'Correct','7 sec']]);
});
test('older package question timers reset per question and subtract retries',()=>{assert.deepEqual(questionHistory({'cmi.interactions.0.id':'2','cmi.interactions.0.result':'incorrect','cmi.interactions.0.latency':'PT15S','cmi.interactions.1.id':'2','cmi.interactions.1.result':'correct','cmi.interactions.1.latency':'PT22S'}).map(r=>r.speed),['15 sec','7 sec']);});
