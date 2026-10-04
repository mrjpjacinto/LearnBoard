import { NextResponse } from "next/server";
import { apiError, jsonBody, uuid, LmsError, checkDb } from "@/lib/lms/auth";
import { learningSession } from "@/lib/scorm/session";
import { validateRuntime } from "@/lib/scorm/runtime";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 512000) throw new LmsError("Runtime data is too large.", 413);
    const { id } = await params;
    const session = await learningSession(id);
    const body = await jsonBody(request);
    const token = uuid(body.session_token, "Session");
    if (token !== session.config.session_token) throw new LmsError("This session was opened in another window. Return to My Learning.", 409);
    if (typeof body.finish !== "boolean" || !body.raw || JSON.stringify(body.raw).length > 500000) throw new LmsError("Invalid runtime request.");
    let metrics;
    try { metrics = validateRuntime(body.raw, session.config.scorm_version!, session.config.passing_score ?? 70); }
    catch(e) { throw new LmsError((e as Error).message); }
    const wallSeconds = Math.floor((Date.now() - Date.parse(session.attempt.started_at)) / 1000);
    const sessionSeconds = Math.max(metrics.sessionSeconds, Math.floor((Date.now() - Date.parse(session.config.session_started_at || session.attempt.started_at)) / 1000));
    const seconds = Math.min(Math.max(0, wallSeconds), Math.max(session.runtime?.total_time_seconds || 0, (session.config.session_base || 0) + sessionSeconds));
    const { error } = await session.admin.rpc("learnboard_commit_runtime", { p_actor: session.profile.id, p_attempt: id, p_token: token, p_raw: metrics.raw, p_score: metrics.score, p_completion: metrics.completion, p_success: metrics.success, p_session_seconds: seconds, p_finish: body.finish });
    if (error?.code === "P0001") throw new LmsError(error.message, 409);
    checkDb(error);
    return NextResponse.json({ saved: true, completion: metrics.completion, success: metrics.success, score: metrics.score });
  } catch(e) { return apiError(e); }
}
