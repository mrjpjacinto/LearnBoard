import { NextResponse } from "next/server";
import { authorize, assertSchool, jsonBody, apiError, checkDb, uuid, LmsError } from "@/lib/lms/auth";
import { scheduleInput } from "@/lib/lms/validation";
export async function POST(request: Request) { return save(request); }
export async function PATCH(request: Request) { return save(request); }
async function save(request: Request) {
  try {
    const { admin, profile } = await authorize(["super_admin", "admin"]);
    const body = await jsonBody(request);
    const kind = body.kind;
    if (kind !== "class" && kind !== "student") throw new LmsError("Choose a class or student.");
    const boardId = body.board_id ? uuid(body.board_id, "Path") : null;
    const gameId = body.game_id ? uuid(body.game_id, "Game") : null;
    if ((!boardId && !gameId) || (boardId && gameId) || (kind === "class" && !boardId)) throw new LmsError("Choose a Learning Path, or a game for an individual student.");
    const targetId = uuid(body.target_id, "Assignment target");
    const id = request.method === "PATCH" ? uuid(body.id, "Assignment") : null;
    const targetResult = kind === "class" ? await admin.from("groups").select("id,school_id,is_active").eq("id", targetId).maybeSingle() : await admin.from("profiles").select("id,school_id,is_active,role").eq("id", targetId).eq("role", "student").maybeSingle();
    const { data: target, error } = targetResult;
    checkDb(error);
    if (!target || !target.is_active || (kind === "student" && "role" in target && target.role !== "student")) throw new LmsError("Choose an active student or class.");
    assertSchool(profile, target.school_id);
    const config = scheduleInput(body);
    if (kind === "class" && config.status === "completed") throw new LmsError("Choose a valid class assignment status.");
    // Path games have one chance and use the availability window for expiration.
    if (boardId) { config.max_attempts = 1; config.time_limit_minutes = null; }
    const { data, error: saveError } = await admin.rpc("learnboard_save_assignment", { p_actor: profile.id, p_kind: kind, p_id: id, p_board: boardId, p_game: gameId, p_target: targetId, p_config: config });
    if (saveError?.code === "P0001") throw new LmsError(saveError.message, 409);
    checkDb(saveError);
    return NextResponse.json({ id: data, success: true });
  } catch (error) { return apiError(error); }
}
