const test=require('node:test'),assert=require('node:assert/strict'),mock=require('./mock-module.cjs'),load=require('./load-typescript.cjs');
function authorization(profile,school=true,signedIn=true){
 const supabase={auth:{getUser:async()=>({data:{user:signedIn?{id:'actor'}:null},error:null})},from(){const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:profile,error:null})};return q}};
 const admin={from(){const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:{is_active:school},error:null})};return q}};
 return mock('lib/lms/auth.ts',{'@/lib/supabase/server':{createClient:async()=>supabase},'@/lib/supabase/admin':{createAdminClient:()=>admin},'next/server':{NextResponse:Response},'next/navigation':{redirect:()=>{throw Error('redirect')}},'@/lib/security/read-json':load('lib/security/read-json.ts')});
}
test('server authorization rejects inactive accounts, inactive schools, missing school, wrong role and anonymous access',async()=>{
 const valid={id:'actor',role:'admin',school_id:'a',is_active:true};
 for(const [profile,school,signedIn,status] of [[valid,true,false,401],[{...valid,is_active:false},true,true,403],[valid,false,true,403],[{...valid,school_id:null},true,true,403],[{...valid,role:'student'},true,true,403]])await assert.rejects(authorization(profile,school,signedIn).authorize(['admin']),e=>e.status===status);
 assert.equal((await authorization(valid).authorize(['admin'])).profile.school_id,'a');
});
test('class ownership rejects another school before returning the privileged client',async()=>{
 const api=authorization({role:'admin',school_id:'a',is_active:true});
 for(const school of ['a','b']){
 const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:{id:'class',school_id:school},error:null})};
 const {ownedClass}=mock('lib/lms/class-auth.ts',{'./auth':{...api,authorize:async()=>({admin:{from:()=>q},profile:{role:'admin',school_id:'a'}}),uuid:v=>v}});
 if(school==='a')assert.equal((await ownedClass('class')).targetClass.school_id,'a');else await assert.rejects(ownedClass('class'),e=>e.status===403);
 }
});
for(const [file,method] of [['app/api/admin/classes/[id]/route.ts','PATCH'],['app/api/admin/classes/[id]/members/route.ts','POST'],['app/api/admin/classes/[id]/members/route.ts','DELETE']])test(method+' class route rejects denied ownership before reading input',async()=>{
 const route=mock(file,{'next/server':{NextResponse:Response},'@/lib/security/read-json':{readJson:()=>{throw Error('Input must not be read before authorization')}},'@/lib/lms/class-auth':{ownedClass:async()=>{throw Object.assign(Error('Denied'),{status:403})}},'@/lib/lms/auth':{apiError:e=>Response.json({error:e.message},{status:e.status||500})}});
 assert.equal((await route[method](new Request('http://test',{method}),{params:Promise.resolve({id:'class'})})).status,403);
});
