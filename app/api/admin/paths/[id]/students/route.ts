import { NextResponse } from "next/server";
import { ownedPath, apiError, checkDb, jsonBody, uuid, LmsError } from "@/lib/lms/auth";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { admin, path } = await ownedPath(id);
    const [students, assignments] = await Promise.all([
      admin.from("profiles").select("id,full_name,email,is_active").eq("school_id",path.school_id).eq("role","student").order("full_name"),
      admin.from("assignments").select("*").eq("board_id",id).eq("school_id",path.school_id),
    ]);
    checkDb(students.error); checkDb(assignments.error);
    return NextResponse.json({ students: students.data || [], assignments: assignments.data || [] });
  } catch(error) { return apiError(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
 try {
 const { id } = await params; const { admin, profile } = await ownedPath(id); const body=await jsonBody(request);
 const {error}=await admin.rpc("lumentrail_remove_path_student",{p_actor:profile.id,p_board:id,p_assignment:uuid(body.assignment_id,"Assignment")});
 if(error?.code==="P0001")throw new LmsError(error.message,409);checkDb(error);
 return NextResponse.json({success:true});
 }catch(error){return apiError(error);}
}
