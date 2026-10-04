import { NextResponse } from "next/server";
import { authorize, jsonBody, uuid, apiError, checkDb, LmsError } from "@/lib/lms/auth";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { admin }=await authorize(["super_admin"]), {id}=await params, body=await jsonBody(request);
    uuid(id,"Game"); if(body.status!=="published"&&body.status!=="draft")throw new LmsError("Choose a valid game status.");
    if(body.status==="published") {
      const {data:game,error}=await admin.from("games").select("package_path,launch_file").eq("id",id).maybeSingle();checkDb(error);if(!game)throw new LmsError("Game not found.",404);
      const ready=await admin.from("scorm_packages").select("id").eq("game_id",id).eq("processing_status","ready").eq("extraction_path",game.package_path || "").eq("launch_file",game.launch_file || "").in("scorm_version",["1.2","2004"]).limit(1);
      checkDb(ready.error);if(!ready.data?.length)throw new LmsError("A ready SCORM 1.2 or 2004 package is required before publishing.",409);
    }
    const {data,error}=await admin.from("games").update({status:body.status,updated_at:new Date().toISOString()}).eq("id",id).select("id,status").maybeSingle();checkDb(error);if(!data)throw new LmsError("Game not found.",404);
    return NextResponse.json({success:true,status:data.status});
  }catch(e){return apiError(e);}
}
