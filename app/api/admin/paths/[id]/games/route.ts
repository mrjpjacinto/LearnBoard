import { NextResponse } from "next/server";
import { ownedPath, jsonBody, apiError, checkDb, LmsError, uuid } from "@/lib/lms/auth";
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await ownedPath(id);
    const body = await jsonBody(request);
    if (!Array.isArray(body.game_ids) || body.game_ids.length > 200) throw new LmsError("Choose up to 200 games.");
    const ids = body.game_ids.map(v => uuid(v, "Game"));
    if (new Set(ids).size !== ids.length) throw new LmsError("A game may appear only once in a path.");
    if (typeof body.expected_updated_at !== "string") throw new LmsError("Reload the path before saving.");
    const { error } = await supabase.rpc("learnboard_save_path_games", { p_board: id, p_games: ids, p_expected: body.expected_updated_at });
    if (error?.code === "P0001") throw new LmsError(error.message, 409);
    checkDb(error);
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
