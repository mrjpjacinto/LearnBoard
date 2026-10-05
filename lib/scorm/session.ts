import "server-only";
import { authorize, checkDb, LmsError, uuid } from "@/lib/lms/auth";
import { availability } from "@/lib/lms/rules";
import { attemptColumns, type Assignment, type ClassAssignment, type Schedule, type Profile } from "@/lib/lms/types";
import { createAdminClient } from "@/lib/supabase/admin";
async function contentAuth(id: string, token: string) {
  const admin=createAdminClient();
  const attempt=await admin.from("attempts").select("student_id").eq("id",uuid(id)).eq("launch_config->>session_token",uuid(token,"Content session")).eq("status","in_progress").maybeSingle();
  checkDb(attempt.error);if(!attempt.data)throw new LmsError("Content session is no longer active.",403);
  const profileResult=await admin.from("profiles").select("id,full_name,email,role,school_id,is_active").eq("id",attempt.data.student_id).eq("role","student").eq("is_active",true).maybeSingle();
  checkDb(profileResult.error);const profile=profileResult.data as Profile|null;
  if(!profile?.school_id)throw new LmsError("Student account is not available.",403);
  const school=await admin.from("schools").select("id").eq("id",profile.school_id).eq("is_active",true).maybeSingle();
  checkDb(school.error);if(!school.data)throw new LmsError("School is not active.",403);
  return {admin,profile};
}
export async function learningSession(id: string, contentToken?: string) {
  const auth = contentToken ? await contentAuth(id,contentToken) : await authorize(["student"]);
  const { admin, profile } = auth;
  const { data: attempt, error } = await admin.from("attempts").select(`${attemptColumns},launch_config`).eq("id", uuid(id)).eq("student_id", profile.id).maybeSingle();
  checkDb(error);
  if (!attempt || attempt.status !== "in_progress" || !attempt.assignment_id || !attempt.package_id) throw new LmsError("This learning session is no longer active.", 403);
  const config = attempt.launch_config as { deadline?: string | null; passing_score?: number; session_token?: string; scorm_version?: string; allow_resume?: boolean; session_base?: number; session_started_at?: string };
  if (!config.session_token || !config.scorm_version) throw new LmsError("Launch this game from My Learning.", 403);
  if (config.deadline && Date.parse(config.deadline) <= Date.now()) throw new LmsError("Time limit reached. Return to My Learning.", 403);
  const { data: assignmentData, error: assignmentError } = await admin.from("assignments").select("*").eq("id", attempt.assignment_id).eq("student_id", profile.id).eq("school_id", profile.school_id!).maybeSingle();
  checkDb(assignmentError);
  if (!assignmentData) throw new LmsError("Assignment is no longer available.", 403);
  const assignment = assignmentData as Assignment;
  let schedule: Schedule = assignment;
  if (assignment.group_assignment_id) {
    const { data: sourceData, error: sourceError } = await admin.from("learning_board_group_assignments").select("*").eq("id", assignment.group_assignment_id).maybeSingle();
    checkDb(sourceError);
    const source = sourceData as ClassAssignment | null;
    if (!source || source.board_id !== assignment.board_id) throw new LmsError("Class assignment is no longer available.", 403);
    const [group, membership] = await Promise.all([admin.from("groups").select("id").eq("id", source.group_id).eq("school_id", profile.school_id!).eq("is_active", true).maybeSingle(), admin.from("group_members").select("group_id").eq("group_id", source.group_id).eq("user_id", profile.id).maybeSingle()]);
    checkDb(group.error); checkDb(membership.error);
    if (!group.data || !membership.data) throw new LmsError("You are no longer assigned to this class.", 403);
    schedule = source;
  }
  if (availability(schedule) !== "Available") throw new LmsError("Assignment is not currently available.", 403);
  if (assignment.board_id) {
    const { data: board, error: boardError } = await admin.from("learning_boards").select("id").eq("id", assignment.board_id).eq("school_id", profile.school_id!).eq("status", "active").maybeSingle();
    checkDb(boardError); if (!board) throw new LmsError("Learning Path is no longer active.", 403);
  }
  const [pkg, game, runtime] = await Promise.all([
    admin.from("scorm_packages").select("id,game_id,launch_file,extraction_path,processing_status,scorm_version").eq("id", attempt.package_id).eq("game_id", attempt.game_id).eq("processing_status", "ready").maybeSingle(),
    admin.from("games").select("id,name,orientation_mode,status").eq("id", attempt.game_id).maybeSingle(),
    admin.from("scorm_runtime_data").select("raw_data,total_time_seconds").eq("attempt_id", id).maybeSingle(),
  ]);
  [pkg,game,runtime].forEach(r => checkDb(r.error));
  if (!pkg.data?.launch_file || !pkg.data.extraction_path || !game.data || game.data.status !== "published") throw new LmsError("Game content is unavailable.", 403);
  return { ...auth, attempt, config, assignment, schedule, package: pkg.data, game: game.data, runtime: runtime.data };
}
