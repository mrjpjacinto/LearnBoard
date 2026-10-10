const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const load = require('./load-typescript.cjs');
const { summarizeQuizzes } = load('lib/lms/quiz-results.ts');
const { personalDetails } = load('lib/lms/personal-details.ts');
const studentId = '00000000-0000-0000-0000-000000000001';
const attemptId = '00000000-0000-0000-0000-000000000002';

function mocked(file, imports) {
  const testModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const requireMock = name => name === 'server-only' ? {} : Object.hasOwn(imports,name) ? imports[name] : name === '@/lib/security/read-json' ? load('lib/security/read-json.ts') : require(name);
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(requireMock,testModule,testModule.exports);
  return testModule.exports;
}

test('assignment status validation accepts database lifecycle states and rejects archived', () => {
  class ValidationError extends Error {}
  const { scheduleInput } = mocked('lib/lms/validation.ts', {'./auth': {LmsError: ValidationError}});
  const settings = {available_from: null, available_until: null, max_attempts: 1, time_limit_minutes: null, passing_score: 70, allow_resume: true};
  for (const status of ['scheduled', 'active', 'expired', 'completed', 'cancelled']) {
    assert.equal(scheduleInput({...settings, status}).status, status);
  }
  assert.throws(() => scheduleInput({...settings, status: 'archived'}), /valid assignment settings/);
  assert.throws(() => scheduleInput({...settings, status: 'unknown'}), /valid assignment settings/);
});
function database(resolve, calls) {
  return { from(table) {
    const filters = {};
    const state = { table, filters, inserted: false };
    const query = {
      select(columns) { if (state.inserted) throw new Error('Post-insert read must not turn a committed save into an error'); state.columns = columns; return query; },
      eq(key,value) { filters[key]=value; return query; },
      in(key,value) { filters[key]=value; return query; },
      neq(key,value) { filters[`neq:${key}`]=value; return query; },
      order() { return query; }, range() { return query; },
      maybeSingle() { return query; }, single() { return query; },
      insert(value) { state.inserted = true; state.value = value; return query; },
      update(value) { state.value = value; return query; },
      then(ok,bad) { calls.push(state); return Promise.resolve(resolve(state)).then(ok,bad); },
    };
    return query;
  } };
}
class LmsError extends Error { constructor(message,status=400) { super(message); this.status=status; } }
const authTools = {
  LmsError, uuid: value => value,
  assertSchool(profile,school) { if (!school || (profile.role !== 'super_admin' && profile.school_id !== school)) throw new LmsError('School access denied',403); },
  checkDb(error) { if (error) throw new Error(error.message); },
};

test('quiz graph counts recorded outcomes and distinct correct quizzes without inventing scores', () => {
  assert.deepEqual(summarizeQuizzes([]), { total_attempts:0,correct:0,incorrect:0,correct_quizzes:0 });
  assert.deepEqual(summarizeQuizzes([{quiz_id:'q1',is_correct:false},{quiz_id:'q1',is_correct:true},{quiz_id:'q1',is_correct:true},{quiz_id:'q2',is_correct:false}]), {total_attempts:4,correct:2,incorrect:2,correct_quizzes:1});
});
test('personal metadata rejects structured values and limits text', () => {
  assert.deepEqual(personalDetails({phone:{role:'super_admin'},job_title:'x'.repeat(120),bio:42}),{phone:'',job_title:'x'.repeat(100),bio:'',avatar:''});
});

test('saved Learning Path returns a success ID without a post-insert read and forces school-admin ownership', async () => {
  const calls=[];
  const admin=database(s => ({ data:s.table==='schools'?{id:'school-a'}:[],error:null }),calls);
  const supabase={auth:{getUser:async()=>({data:{user:{id:studentId}},error:null})},...database(()=>({data:{role:'admin',is_active:true,school_id:'school-a'},error:null}),[])};
  const {POST}=mocked('app/api/admin/paths/route.ts',{
    'next/server':{NextResponse:Response},'@/lib/supabase/server':{createClient:async()=>supabase},'@/lib/supabase/admin':{createAdminClient:()=>admin},
  });
  const response=await POST(new Request('http://localhost/api/admin/paths',{method:'POST',body:JSON.stringify({name:'Path',status:'active',school_id:'school-b'})}));
  assert.equal(response.status,201);
  const body=await response.json();
  assert.match(body.path.id,/^[a-f0-9-]{36}$/);
  const inserts=calls.filter(c=>c.inserted);assert.equal(inserts.length,1);assert.equal(inserts[0].value.id,body.path.id);assert.equal(inserts[0].value.school_id,'school-a');
});

for (const [name,studentSchool,assignmentSchool,allowed] of [
  ['another student school','school-b','school-a',false],
  ['historical assignment in another school','school-a','school-b',false],
  ['matching school','school-a','school-a',true],
]) test(`quiz detail enforces ${name}`,async()=>{
  const calls=[];
  const admin=database(s=>({data:s.table==='attempts'?{id:attemptId,student_id:studentId,game_id:'game',assignment_id:'assignment'}:s.table==='profiles'?{school_id:studentSchool,role:'student'}:s.table==='assignments'?{school_id:assignmentSchool,student_id:studentId}:[{id:'event',attempt_id:attemptId,quiz_id:'q1',is_correct:true}],error:null}),calls);
  const {reportAttempt}=mocked('lib/lms/reports.ts',{
    './auth':{...authTools,authorize:async()=>({admin,profile:{role:'admin',school_id:'school-a'}})},
    './query':{readAll:async q=>(await q).data},'./quiz-results':{summarizeQuizzes},
  });
  if(allowed){const detail=await reportAttempt(attemptId);assert.equal(detail.correct,1);const query=calls.find(c=>c.table==='game_score_events');assert.equal(query.filters.student_id,studentId);assert.equal(query.filters.attempt_id,attemptId);assert.equal(query.filters.game_id,'game');}
  else {await assert.rejects(reportAttempt(attemptId),e=>e.status===403);assert.equal(calls.some(c=>c.table==='game_score_events'),false);}
});

test('unconfirmed email request never writes the proposed address to the profile',async()=>{
  const calls=[],updates=[];
  const admin=database(()=>({error:null}),calls);
  const supabase={auth:{signInWithPassword:async()=>({data:{user:{id:studentId}},error:null}),updateUser:async value=>{updates.push(value);return {data:{user:{id:studentId,email:'old@example.com'}},error:null};}}};
  const {PATCH}=mocked('app/api/account/settings/route.ts',{
    'next/server':{NextResponse:Response},'@/lib/lms/auth':{...authTools,authorize:async()=>({supabase,admin,profile:{id:studentId},user:{id:studentId,email:'old@example.com'}}),jsonBody:r=>r.json(),apiError:e=>Response.json({error:e.message},{status:e.status||500})},
  });
  const response=await PATCH(new Request('http://localhost/api/account/settings',{method:'PATCH',body:JSON.stringify({action:'email',email:'new@example.com',current_password:'current'})}));
  assert.equal(response.status,200);assert.match((await response.json()).message,/confirmation/);assert.deepEqual(updates,[{email:'new@example.com'}]);assert.equal(calls.length,0);
});

for (const [role, school, visible] of [['super_admin',null,true],['admin','school-a',true],['admin','school-b',false]]) {
  test(`Learning Path edit page loads only the path allowed for ${role} at ${school}`,async()=>{
    const calls=[];
    const admin=database(s=>({data:s.table==='schools'?{id:'school-a',name:'School A'}:s.filters.school_id && s.filters.school_id !== 'school-a'?null:{id:attemptId,name:'Existing Path',description:'Original',status:'active',school_id:'school-a'},error:null}),calls);
    const {default:EditPage}=mocked('app/admin/paths/[id]/edit/page.tsx',{
      'next/link':()=>null,'next/navigation':{notFound:()=>{throw new LmsError('Not found',404);}},
      '@/lib/lms/auth':{...authTools,pageAuth:async()=>({admin,profile:{role,school_id:school}})},
      '@/components/EditLearningPathForm':()=>null,
      '@/components/ActionIcon':()=>null,
    });
    if(visible){const page=await EditPage({params:Promise.resolve({id:attemptId})});assert.ok(page);}
    else await assert.rejects(EditPage({params:Promise.resolve({id:attemptId})}),e=>e.status===404);
    const query=calls.find(c=>c.table==='learning_boards');assert.equal(query.filters.id,attemptId);
    if(role==='admin')assert.equal(query.filters.school_id,school);
    if(!visible)assert.equal(calls.some(c=>c.table==='schools'),false);
  });
}
for(const [label,name,peers,status] of [['save valid edits',' Renamed ',[],200],['reject duplicate names','Renamed',[{id:'other',name:'renamed'}],409],['reject blank names',' ',[],400]]) {
  test(`Learning Path API ${label}`,async()=>{
    const calls=[];
    const admin=database(s=>({data:s.value?{id:attemptId,...s.value}:peers,error:null}),calls);
    const {PATCH}=mocked('app/api/admin/paths/[id]/route.ts',{
      'next/server':{NextResponse:Response},
      '@/lib/lms/auth':{...authTools,ownedPath:async()=>({admin,path:{id:attemptId,school_id:'school-a'}}),jsonBody:r=>r.json(),apiError:e=>Response.json({error:e.message},{status:e.status||500})},
    });
    const response=await PATCH(new Request('http://localhost/api/admin/paths/'+attemptId,{method:'PATCH',body:JSON.stringify({name,description:' Changed ',status:'archived'})}),{params:Promise.resolve({id:attemptId})});
    assert.equal(response.status,status);
    const writes=calls.filter(c=>c.value);
    if(status===200){assert.equal(writes.length,1);assert.equal(writes[0].filters.id,attemptId);assert.equal(writes[0].filters.school_id,'school-a');assert.equal(writes[0].value.name,'Renamed');assert.equal(writes[0].value.description,'Changed');assert.equal(writes[0].value.status,'archived');}
    else assert.equal(writes.length,0);
  });
}
test('Learning Path API rejects unauthorized editing before any write',async()=>{
  const {PATCH}=mocked('app/api/admin/paths/[id]/route.ts',{'next/server':{NextResponse:Response},'@/lib/lms/auth':{...authTools,ownedPath:async()=>{throw new LmsError('School access denied',403);},jsonBody:r=>r.json(),apiError:e=>Response.json({error:e.message},{status:e.status||500})}});
  const response=await PATCH(new Request('http://localhost/api/admin/paths/'+attemptId,{method:'PATCH',body:'{}'}),{params:Promise.resolve({id:attemptId})});assert.equal(response.status,403);
});

for (const [suffix,method] of [['route.ts','PATCH'],['delete/route.ts','DELETE'],['scorm/download/route.ts','GET'],['scorm/replace/route.ts','POST'],['scorm/remove/route.ts','DELETE']]) test(`School Admin cannot access global game management: ${method} ${suffix}`,async()=>{
  let privilegedAccess=false;
  const supabase={auth:{getUser:async()=>({data:{user:{id:studentId}},error:null})},...database(()=>({data:{role:'admin',is_active:true,school_id:'school-a'},error:null}),[])};
  const route=mocked('app/api/admin/games/[id]/'+suffix,{
    '@/lib/lms/auth':{LmsError},'@/lib/lms/game-skills':{},'@/lib/lms/game-skills-server':{},'@/lib/scorm/cleanup-worker':{},
    'next/server':{NextResponse:Response},'@/lib/supabase/server':{createClient:async()=>supabase},
    '@/lib/supabase/admin':{createAdminClient:()=>{privilegedAccess=true;throw new Error('Unauthorized privileged access');}},
    '@/lib/scorm/process-package':{processScormPackage:()=>{throw new Error('Unauthorized package processing');}},
  });
  const response=await route[method](new Request('http://localhost/api/admin/games/game',{method}),{params:Promise.resolve({id:'game'})});
  assert.equal(response.status,403);assert.equal(privilegedAccess,false);
});

test('tile reordering supports first, middle and last positions without losing games',()=>{
 const {reorderGames}=load('lib/ui/reorder-games.ts');
 const original=['a','b','c','d'];
 assert.deepEqual(reorderGames(original,'d','a'),['d','a','b','c']);
 assert.deepEqual(reorderGames(original,'a','d'),['b','c','d','a']);
 assert.deepEqual(reorderGames(original,'d','b'),['a','d','b','c']);
 assert.deepEqual(reorderGames(original,'a','c'),['b','c','a','d']);
 assert.deepEqual(reorderGames(original,'missing','b'),original);
 assert.deepEqual(reorderGames(original,'b','b'),original);
 assert.deepEqual(original,['a','b','c','d']);
});
