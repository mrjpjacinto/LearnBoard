import { NextResponse } from "next/server";
import { ownedPath, jsonBody, apiError, checkDb, LmsError } from "@/lib/lms/auth";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { admin, path } = await ownedPath(id);
    const body = await jsonBody(request);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!name || name.length > 150 || description.length > 1000 || !["active", "archived"].includes(String(body.status))) throw new LmsError("Choose a name (up to 150 characters), description (up to 1,000), and valid status.");
    const { data: peers, error: peersError } = await admin.from("learning_boards").select("id,name").eq("school_id", path.school_id).neq("id", id);
    checkDb(peersError);
    if (peers?.some(p => p.name.trim().toLowerCase() === name.toLowerCase())) throw new LmsError("A Learning Path with this name already exists at this school.", 409);
    const { data, error } = await admin.from("learning_boards").update({ name, description: description || null, status: body.status, updated_at: new Date().toISOString() }).eq("id", id).eq("school_id", path.school_id).select("id,name,description,status,school_id,updated_at").single();
    checkDb(error);
    return NextResponse.json({ path: data });
  } catch (error) { return apiError(error); }
}
