import "server-only";
import {checkDb} from "@/lib/lms/auth";
import type {createAdminClient} from "@/lib/supabase/admin";
type Admin=ReturnType<typeof createAdminClient>;
type Job={package_id:string;game_id:string;storage_path:string;extraction_path:string};
export function ownedCleanupPaths(job:Job){
 const paths=[job.storage_path,job.extraction_path];
 return job.storage_path.startsWith(job.game_id+"/source/") && job.extraction_path.startsWith(job.game_id+"/packages/"+job.package_id+"/") && paths.every(p=>p.split("/").every(s=>s&&s!=="."&&s!==".."&&!/[\\\u0000]/.test(s)));
}
export async function queueReplacementCleanup(admin:Admin,gameId:string){
 const r=await admin.rpc("lumentrail_queue_scorm_cleanup",{p_game:gameId});checkDb(r.error);
 return {status:"queued",automatic_deletion_enabled:true,preview_grace_minutes:35};
}
async function extractedFiles(admin:Admin,prefix:string):Promise<string[]>{
 const keys:string[]=[];
 for(let offset=0;;offset+=100){
 const r=await admin.storage.from("scorm-packages").list(prefix,{limit:100,offset});checkDb(r.error);
 if(!r.data)throw Error("Storage inventory unavailable");
 for(const item of r.data){if(!item.name||item.name.includes("/")||item.name.includes("\\")||item.name==="."||item.name==="..")throw Error("Unsafe storage object");
 const key=prefix+"/"+item.name;if(item.id)keys.push(key);else keys.push(...await extractedFiles(admin,key));}
 if(r.data.length<100)return keys;
 }
}
export async function runScormCleanup(admin:Admin){
 const jobs=await admin.from("scorm_cleanup_jobs").select("package_id,game_id,storage_path,extraction_path").neq("state","complete").lte("eligible_at",new Date().toISOString()).order("eligible_at").limit(20);checkDb(jobs.error);
 let removed=0,retained=0,failed=0;
 for(const job of (jobs.data||[]) as Job[]){
 try{
 if(!ownedCleanupPaths(job))throw Error("Unrecognized storage ownership");
 const claim=await admin.rpc("lumentrail_detach_scorm_cleanup",{p_package:job.package_id});checkDb(claim.error);
 if(!claim.data){retained++;const delay=await admin.from("scorm_cleanup_jobs").update({eligible_at:new Date(Date.now()+86400000).toISOString()}).eq("package_id",job.package_id);checkDb(delay.error);continue;}
 const keys=[job.storage_path,...await extractedFiles(admin,job.extraction_path)];
 for(let offset=0;offset<keys.length;offset+=100){const r=await admin.storage.from("scorm-packages").remove(keys.slice(offset,offset+100));checkDb(r.error);}
 const done=await admin.from("scorm_cleanup_jobs").update({state:"complete",completed_at:new Date().toISOString(),last_error:null}).eq("package_id",job.package_id);checkDb(done.error);removed++;
 }catch{failed++;const error=await admin.from("scorm_cleanup_jobs").update({last_error:"Cleanup incomplete; will retry."}).eq("package_id",job.package_id);checkDb(error.error);}
 }
 return {removed,retained,failed};
}
