import "server-only";
import { authorize, checkDb, LmsError, uuid } from "@/lib/lms/auth";
import { sameRuntime } from "./save-request";
// A lost completion response can be acknowledged again without rewriting results.
export async function completedReceipt(id: string, token: string, raw: unknown) {
  const { admin, profile } = await authorize(["student"]);
  const attempt = await admin.from("attempts").select("id,assignment_id,status,launch_config,score,completion_status,success_status").eq("id", uuid(id)).eq("student_id", profile.id).maybeSingle();
  checkDb(attempt.error);
  const item = attempt.data;
  if (!item || item.status !== "completed") return null;
  if (item.launch_config?.session_token !== token) throw new LmsError("This session is no longer active.", 409);
  const assignment = await admin.from("assignments").select("school_id,score_visible,group_assignment_id,board_id").eq("id", item.assignment_id).eq("student_id", profile.id).eq("school_id", profile.school_id!).maybeSingle();
  checkDb(assignment.error);
  if (!assignment.data) throw new LmsError("Assignment is no longer available.", 403);
  const runtime = await admin.from("scorm_runtime_data").select("raw_data").eq("attempt_id", id).maybeSingle();
  checkDb(runtime.error);
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !runtime.data?.raw_data || !sameRuntime(raw as Record<string,string>, runtime.data.raw_data)) throw new LmsError("This attempt is already completed. Reload My Learning to view its saved result.", 409);
  let visible = assignment.data.score_visible !== false;
  if (assignment.data.group_assignment_id) {
    const source = await admin.from("learning_board_group_assignments").select("score_visible,board_id").eq("id", assignment.data.group_assignment_id).maybeSingle();
    checkDb(source.error);
    visible = !!source.data && source.data.board_id === assignment.data.board_id && source.data.score_visible !== false;
  }
  return { saved: true, completion: item.completion_status, success: visible ? item.success_status : "unknown", score: visible ? item.score : null };
}
