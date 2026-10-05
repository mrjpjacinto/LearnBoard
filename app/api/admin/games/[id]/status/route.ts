import { NextResponse } from "next/server";
import { authorize, jsonBody, uuid, apiError, checkDb, LmsError } from "@/lib/lms/auth";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { admin }=await authorize(["super_admin"]), {id}=await params, body=await jsonBody(request);
    uuid(id,"Game"); if(body.status!=="published"&&body.status!=="draft")throw new LmsError("Choose a valid game status.");
    if(body.status==="published") {
      const {data:game,error}=await admin.from("games").select("package_path,launch_file").eq("id",id).maybeSingle();checkDb(error);if(!game)throw new LmsError("Game not found.",404);
      // Older uploads can have ready package metadata without game pointers.
      // Restore only an unambiguous package on this explicit Publish action.
      if (!game.package_path && !game.launch_file) {
        const candidates = await admin.from("scorm_packages").select("id,extraction_path,launch_file,scorm_version").eq("game_id",id).eq("processing_status","ready").in("scorm_version",["1.2","2004"]).limit(2);
        checkDb(candidates.error);
        const pkg = candidates.data?.length === 1 ? candidates.data[0] : null;
        if (!pkg?.extraction_path || !pkg.launch_file) throw new LmsError("The game’s launch settings are missing. Choose or replace its SCORM package before publishing.",409);
        const restored = await admin.from("games").update({package_path:pkg.extraction_path,launch_file:pkg.launch_file,scorm_version:`SCORM ${pkg.scorm_version}`}).eq("id",id).is("package_path",null).is("launch_file",null).select("id").maybeSingle();
        checkDb(restored.error);
        if (!restored.data) throw new LmsError("The game changed. Reload before publishing.",409);
        game.package_path = pkg.extraction_path; game.launch_file = pkg.launch_file;
      }
      const ready=await admin.from("scorm_packages").select("id").eq("game_id",id).eq("processing_status","ready").eq("extraction_path",game.package_path || "").eq("launch_file",game.launch_file || "").in("scorm_version",["1.2","2004"]).limit(1);
      checkDb(ready.error);if(!ready.data?.length)throw new LmsError("A ready SCORM 1.2 or 2004 package is required before publishing.",409);
    }
    const {data,error}=await admin.from("games").update({status:body.status,updated_at:new Date().toISOString()}).eq("id",id).select("id,status").maybeSingle();checkDb(error);if(!data)throw new LmsError("Game not found.",404);
    return NextResponse.json({success:true,status:data.status});
  }catch(e){return apiError(e);}
}
