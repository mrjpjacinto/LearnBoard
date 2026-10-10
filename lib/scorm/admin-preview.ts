import "server-only";
import {authorize,checkDb,LmsError,uuid} from "@/lib/lms/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {signPreview,verifyPreview} from "./preview-token";
function secret(){const v=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!v)throw new LmsError("Preview unavailable.",503);return v}
export async function schoolPreviewAccess(admin:ReturnType<typeof createAdminClient>,game:string,school:string|null){
 if(!school)throw new LmsError("School unavailable.",403);
 const available=await admin.from("games").select("id").eq("id",game).eq("status","published").maybeSingle();checkDb(available.error);
 if(!available.data)throw new LmsError("This game is not published in the shared library.",403);
}
export async function createPreview(id:string){const {admin,profile}=await authorize(["super_admin","admin"]);uuid(id);
 const g=await admin.from("games").select("id,name,status,package_path,launch_file").eq("id",id).maybeSingle();checkDb(g.error);if(!g.data||(profile.role==="admin"&&g.data.status!=="published"))throw new LmsError("Game unavailable.",403);
 if(profile.role==="admin")await schoolPreviewAccess(admin,id,profile.school_id);
 const p=await admin.from("scorm_packages").select("id").eq("game_id",id).eq("extraction_path",g.data.package_path||"").eq("launch_file",g.data.launch_file||"").eq("processing_status","ready").in("scorm_version",["1.2","2004"]).maybeSingle();checkDb(p.error);if(!p.data)throw new LmsError("A ready package is required.",409);
 return {title:g.data.name,token:signPreview({user:profile.id,game:id,package:p.data.id,expires:Date.now()+1800000},secret())}}
export async function previewContent(token:string){let c;try{c=verifyPreview(token,secret())}catch{throw new LmsError("Preview expired. Reopen Game Details.",403)}const admin=createAdminClient();
 const r=await admin.from("profiles").select("role,is_active,school_id").eq("id",c.user).maybeSingle();checkDb(r.error);if(!r.data?.is_active||!["admin","super_admin"].includes(r.data.role))throw new LmsError("Preview access denied.",403);
 if(r.data.role==="admin"){const school=await admin.from("schools").select("id").eq("id",r.data.school_id||"").eq("is_active",true).maybeSingle();checkDb(school.error);if(!school.data)throw new LmsError("School unavailable.",403);await schoolPreviewAccess(admin,c.game,r.data.school_id)}
 const g=await admin.from("games").select("status").eq("id",c.game).maybeSingle();checkDb(g.error);if(!g.data||(r.data.role==="admin"&&g.data.status!=="published"))throw new LmsError("Game unavailable.",403);
 const p=await admin.from("scorm_packages").select("launch_file,extraction_path,scorm_version").eq("id",c.package).eq("game_id",c.game).eq("processing_status","ready").in("scorm_version",["1.2","2004"]).maybeSingle();checkDb(p.error);if(!p.data?.launch_file||!p.data.extraction_path)throw new LmsError("Preview package unavailable.",404);return {admin,package:p.data}}
