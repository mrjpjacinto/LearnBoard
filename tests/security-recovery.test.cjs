const test = require('node:test'), assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { mutationAccountAllowed, MutationLimiter } = load('lib/security/mutation-policy.ts');
const { readZipEntry } = load('lib/scorm/package-limits.ts');
const { sameRuntime, saveRuntime } = load('lib/scorm/save-request.ts');
const JSZip = require('jszip');
test('all mutation roles require an active account and tenant except platform owner', () => {
 for(const role of ['admin','student']) {
  assert.equal(mutationAccountAllowed({role,school_id:'a',is_active:true},true),true);
  assert.equal(mutationAccountAllowed({role,school_id:'a',is_active:true},false),false);
  assert.equal(mutationAccountAllowed({role,school_id:null,is_active:true},true),false);
 }
 assert.equal(mutationAccountAllowed({role:'super_admin',school_id:null,is_active:true},false),true);
 assert.equal(mutationAccountAllowed({role:'super_admin',school_id:null,is_active:false},true),false);
 assert.equal(mutationAccountAllowed({role:'other',school_id:'a',is_active:true},true),false);
});
test('limiter isolates users and categories and expires without growing indefinitely', () => {
 const limiter = new MutationLimiter(2);
 assert.equal(limiter.take('a:account',1,1000,0),0);
 assert.equal(limiter.take('a:account',1,1000,1),1);
 assert.equal(limiter.take('b:account',1,1000,1),0);
 assert.equal(limiter.take('a:runtime',10,1000,1),1);
 assert.equal(limiter.take('a:account',1,1000,1001),0);
});
test('compressed oversized files stop before accumulation and boundary files remain readable', async () => {
 const zip = new JSZip(); zip.file('large.txt','a'.repeat(100000)); zip.file('small.txt','hello');
 const loaded = await JSZip.loadAsync(await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
 await assert.rejects(readZipEntry(loaded.file('large.txt'),1000),/permitted size/);
 assert.equal(new TextDecoder().decode(await readZipEntry(loaded.file('small.txt'),5)),'hello');
 await assert.rejects(readZipEntry(loaded.file('small.txt'),4),/permitted size/);
});
test('replay comparison ignores property ordering but rejects changed or missing fields', () => {
 assert.equal(sameRuntime({a:'1',b:'2'},{b:'2',a:'1'}),true);
 assert.equal(sameRuntime({a:'1'},{a:'2'}),false);
 assert.equal(sameRuntime({a:'1'},{}),false);
});
test('save surfaces server refusal and network failures and sends a bounded request', async () => {
 await assert.rejects(saveRuntime('/save',{},async()=>Response.json({error:'Session expired'},{status:403})),/Session expired/);
 await assert.rejects(saveRuntime('/save',{},async()=>{throw new Error('Offline')}),/Offline/);
 const result=await saveRuntime('/save',{finish:true},async(url,options)=>{
  assert.equal(url,'/save');assert.equal(options.method,'POST');assert.ok(options.signal);assert.equal(JSON.parse(options.body).finish,true);
  return Response.json({saved:true});
 });assert.equal(result.saved,true);
});

test('JSON reader enforces streamed bytes even without Content-Length and rejects malformed bodies',async()=>{
 const {readJson}=load('lib/security/read-json.ts');
 await assert.rejects(readJson(new Request('http://test',{method:'POST',body:'{"data":"'+ 'x'.repeat(50)+'"}'}),20),e=>e.status===413);
 for(const body of ['[]','null','broken'])await assert.rejects(readJson(new Request('http://test',{method:'POST',body})),e=>e.status===400);
 assert.deepEqual(await readJson(new Request('http://test',{method:'POST',body:'{"ok":true}'})),{ok:true});
});
test('runtime report projection keeps distinct answers and is stable on repeated reads',()=>{
 const {runtimeQuizEvents}=load('lib/lms/quiz-results.ts');
 const raw={'cmi.interactions.0.id':'q','cmi.interactions.0.result':'wrong','cmi.interactions.0.latency':'PT2S','cmi.interactions.1.id':'q','cmi.interactions.1.result':'correct','cmi.interactions.2.id':'other','cmi.interactions.2.result':'unanticipated'};
 const events=runtimeQuizEvents('attempt',raw,'saved');assert.equal(events.length,2);assert.equal(events[0].is_correct,false);assert.equal(events[0].speed,2);assert.equal(events[1].quiz_attempt,2);assert.deepEqual(events,runtimeQuizEvents('attempt',raw,'saved'));
});

test('ZIP sanitization cannot conceal traversal and absolute paths are denied',async()=>{
 const {assertPackagePath}=load('lib/scorm/package-limits.ts');
 const zip=new JSZip();zip.file('../escape.js','bad');const loaded=await JSZip.loadAsync(await zip.generateAsync({type:'nodebuffer'}));
 const entry=loaded.file('escape.js');assert.ok(entry);assert.throws(()=>assertPackagePath(entry.unsafeOriginalName),/unsafe/);
 for(const path of ['/root/file','C:/file','folder/../file','folder\\..\\file','a\0b'])assert.throws(()=>assertPackagePath(path),/unsafe/);
 assert.doesNotThrow(()=>assertPackagePath('folder/game.js'));
});
