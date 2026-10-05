import { NextResponse } from "next/server";
import { ownedPath, apiError, checkDb } from "@/lib/lms/auth";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { admin, path } = await ownedPath(id);
    const [students, assignments] = await Promise.all([
      admin.from("profiles").select("id,full_name,email,is_active").eq("school_id",path.school_id).eq("role","student").order("full_name"),
      admin.from("assignments").select("id,student_id,status,available_until,group_assignment_id").eq("board_id",id).eq("school_id",path.school_id),
    ]);
    checkDb(students.error); checkDb(assignments.error);
    return NextResponse.json({ students: students.data || [], assignments: assignments.data || [] });
  } catch(error) { return apiError(error); }
}
