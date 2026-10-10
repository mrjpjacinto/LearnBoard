// Read-only: no SQL execution, Auth changes, storage writes, or personal data output.
const {loadEnvConfig}=require('@next/env');const {createClient}=require('@supabase/supabase-js');loadEnvConfig(process.cwd());
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('Missing existing Supabase connection settings.');
const request=(u,options)=>fetch(u,{...options,signal:AbortSignal.timeout(15000)});
const db=createClient(url,key,{auth:{persistSession:false},global:{fetch:request}});
(async()=>{
 const counts=await Promise.all(['profiles','schools','games','learning_boards','assignments','attempts','scorm_runtime_data','game_score_events'].map(async table=>{
 const r=await db.from(table).select('*',{count:'exact',head:true});return {table,count:r.count,ok:!r.error&&r.count!==null,error:r.error?.code|| (r.error?'request_failed':null)};
 }));
 const response=await request(url+'/rest/v1/',{headers:{apikey:key,Authorization:'Bearer '+key}});if(!response.ok)throw new Error('REST schema inspection failed.');
 const schema=await response.json();const buckets=await db.storage.listBuckets();
 const authResponse=await request(url+"/auth/v1/settings",{headers:{apikey:key,Authorization:"Bearer "+key}});const auth=authResponse.ok?await authResponse.json():null;
 console.log(JSON.stringify({counts,authSettings:auth?{disable_signup:auth.disable_signup,mailer_autoconfirm:auth.mailer_autoconfirm,phone_autoconfirm:auth.phone_autoconfirm,external_email:auth.external?.email}:"unverified",masterPathsTable:!!schema.definitions?.learning_board_school_availability,runtimeColumns:Object.keys(schema.definitions?.scorm_runtime_data?.properties||{}),functions:Object.keys(schema.paths||{}).filter(p=>p.startsWith('/rpc/')),buckets:buckets.error?'unverified':(buckets.data||[]).map(b=>({name:b.name,public:b.public,file_size_limit:b.file_size_limit})),limitations:'REST metadata does not verify function bodies, RLS policies, grants, constraints, complete Auth configuration, or backups.'},null,2));
 if(counts.some(r=>!r.ok)||buckets.error)process.exitCode=1;
})().catch(()=>{console.error('Read-only Supabase inspection failed; no zero-count inference is valid.');process.exitCode=1});
