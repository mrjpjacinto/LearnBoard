import "server-only";
import { authorize, assertSchool, checkDb, LmsError, uuid } from "./auth";
import { readAll } from "./query";
export async function reportData(params: URLSearchParams) {
  const { admin, profile } = await authorize(["super_admin", "admin"]);
  let students = admin.from("profiles").select("id,full_name,email,school_id").eq("role", "student").order("full_name");
  const school = params.get("school");
  if (profile.role !== "super_admin") students = students.eq("school_id", profile.school_id!);
  if (school) { uuid(school, "School"); assertSchool(profile, school); students = students.eq("school_id", school); }
  if (params.get("student")) students = students.eq("id", uuid(params.get("student"), "Student"));
  if (params.get("class")) {
    const groupId = uuid(params.get("class"), "Class");
    const group = await admin.from("groups").select("school_id").eq("id",groupId).maybeSingle();
    checkDb(group.error); if (!group.data) throw new LmsError("Class not found.",404); assertSchool(profile,group.data.school_id);
    const members = await admin.from("group_members").select("user_id").eq("group_id",groupId); checkDb(members.error);
    if (!members.data?.length) return { rows: [], total: 0, page: 1, students: [] };
    students = students.in("id",members.data.map(m => m.user_id));
  }
  const roster = await readAll(students.order("id"));
  const ids = roster.map(s => s.id);
  const page = Math.floor(Math.max(1,Math.min(10000,Number(params.get("page")) || 1)));
  if (!ids.length) return { rows: [], total: 0, page, students: [] };
  // Never select package IDs, launch configuration or runtime data for reports.
  let attempts = admin.from("attempts").select("id,student_id,game_id,assignment_id,attempt_number,started_at,completed_at,score,status,completion_status,success_status,time_spent_seconds",{ count:"exact" }).in("student_id",ids);
  const game = params.get("game"); if (game) attempts = attempts.eq("game_id",uuid(game,"Game"));
  const board = params.get("path");
  let assignmentQuery = admin.from("assignments").select("id,board_id").in("student_id",ids);
  if (profile.role !== "super_admin") assignmentQuery = assignmentQuery.eq("school_id",profile.school_id!);
  if (board) assignmentQuery = assignmentQuery.eq("board_id",uuid(board,"Path"));
  const assignments = await readAll(assignmentQuery.order("id"));
  if (board || profile.role !== "super_admin") { if (!assignments.length) return { rows: [], total: 0, page, students: roster }; attempts = attempts.in("assignment_id",assignments.map(a=>a.id)); }
  if (params.get("from") && params.get("until") && params.get("from")! > params.get("until")!) throw new LmsError("The ending date must be on or after the starting date.");
  for (const [name, op] of [["from","gte"],["until","lt"]] as const) {
    const date = params.get(name); if (!date) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) throw new LmsError("Choose valid report dates.");
    const value = new Date(`${date}T00:00:00+08:00`); if (name === "until") value.setUTCDate(value.getUTCDate()+1);
    attempts = op === "gte" ? attempts.gte("started_at",value.toISOString()) : attempts.lt("started_at",value.toISOString());
  }
  const result = await attempts.order("started_at",{ascending:false}).range((page-1)*100,page*100-1); checkDb(result.error);
  const gameIds = [...new Set((result.data || []).map(a=>a.game_id))];
  const pathIds = [...new Set(assignments.map(a=>a.board_id).filter((id): id is string=>!!id))];
  const [games,boards] = await Promise.all([gameIds.length ? admin.from("games").select("id,name").in("id",gameIds) : {data:[],error:null},pathIds.length ? admin.from("learning_boards").select("id,name").in("id",pathIds) : {data:[],error:null}]); checkDb(games.error); checkDb(boards.error);
  const rows = (result.data || []).map(a=>{const student=roster.find(s=>s.id===a.student_id); const assignment=assignments.find(v=>v.id===a.assignment_id); return {...a,student_name:student?.full_name || student?.email || "Student",school_id:student?.school_id,game_name:games.data?.find(g=>g.id===a.game_id)?.name || "Game unavailable",path_name:boards.data?.find(b=>b.id===assignment?.board_id)?.name || "Individual game"};});
  return { rows,total:result.count || 0,page,students:roster };
}
