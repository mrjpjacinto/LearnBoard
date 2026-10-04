import { NextResponse } from "next/server";
import { authorize, jsonBody, uuid, checkDb, apiError, LmsError } from "@/lib/lms/auth";
export async function POST(request: Request) {
  try {
    const { supabase } = await authorize(["student"]);
    const body = await jsonBody(request), game = uuid(body.game_id, "Game");
    let assignment: string;
    if (body.class_assignment_id) {
      const result = await supabase.rpc("learnboard_resolve_class_assignment", { p_source: uuid(body.class_assignment_id) });
      if (result.error?.code === "P0001") throw new LmsError(result.error.message, 403);
      checkDb(result.error); assignment = result.data;
    } else assignment = uuid(body.assignment_id, "Assignment");
    const { data, error } = await supabase.rpc("learnboard_start_attempt", { p_assignment: assignment, p_game: game });
    if (error?.code === "P0001") throw new LmsError(error.message, 409);
    checkDb(error);
    const attempt = Array.isArray(data) ? data[0] : data;
    if (!attempt?.id) throw new LmsError("Unable to create a learning session.", 500);
    return NextResponse.json({ attempt_id: attempt.id });
  } catch(error) { return apiError(error); }
}
