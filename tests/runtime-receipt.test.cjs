const test=require('node:test'),assert=require('node:assert/strict'),mock=require('./mock-module.cjs'),load=require('./load-typescript.cjs');
class LmsError extends Error{constructor(message,status){super(message);this.status=status;}}
const raw={'cmi.core.lesson_status':'completed'};
function fixture({token='token',school='a',owner='student',visible=true,status='completed'}={}){
 const calls=[];const admin={from(table){const filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},maybeSingle(){return q},then(resolve){calls.push({table,filters});const data=table==='attempts'?(filters.student_id===owner?{status,assignment_id:'assignment',launch_config:{session_token:token},score:90,success_status:'passed',completion_status:'completed'}:null):table==='assignments'?(filters.school_id===school?{school_id:school,score_visible:visible}:null):{raw_data:raw};return Promise.resolve({data,error:null}).then(resolve)}};return q}};
 const api=mock('lib/scorm/receipt.ts',{'@/lib/lms/auth':{authorize:async()=>({admin,profile:{id:'student',school_id:'a'}}),uuid:v=>v,checkDb:e=>{if(e)throw e},LmsError},'./save-request':load('lib/scorm/save-request.ts')});return {...api,calls};
}
test('lost completion response returns saved result without writing',async()=>{const f=fixture();assert.equal((await f.completedReceipt('id','token',raw)).score,90);assert.ok(f.calls.every(c=>c.filters));});
test('completion replay rejects stale tokens, changed results, and cross-school history',async()=>{
 await assert.rejects(fixture().completedReceipt('id','stale',raw),e=>e.status===409);
 await assert.rejects(fixture().completedReceipt('id','token',{'cmi.core.lesson_status':'incomplete'}),e=>e.status===409);
 await assert.rejects(fixture({school:'b'}).completedReceipt('id','token',raw),e=>e.status===403);
 assert.equal(await fixture({owner:'other'}).completedReceipt('id','token',raw),null);
});
test('hidden scores remain hidden during replay and unfinished attempts are never acknowledged',async()=>{
 const saved=await fixture({visible:false}).completedReceipt('id','token',raw);assert.equal(saved.score,null);assert.equal(saved.success,'unknown');
 assert.equal(await fixture({status:'in_progress'}).completedReceipt('id','token',raw),null);
});
