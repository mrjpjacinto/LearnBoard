import "server-only";
import { authorize, assertSchool, checkDb, LmsError, uuid } from "./auth";
import { readAll } from "./query";
import { summarizeQuizzes, runtimeQuizEvents, type QuizEvent } from "./quiz-results";
async function withRuntimeEvents(admin: Awaited<ReturnType<typeof authorize>>["admin"], events: QuizEvent[], attemptIds: string[]) {
  const missing = attemptIds.filter(id => !events.some(event => event.attempt_id === id));
  if (!missing.length) return events;
  const runtime = await readAll(admin.from("scorm_runtime_data").select("attempt_id,raw_data,updated_at").in("attempt_id",missing).order("attempt_id"));
  return [...events,...runtime.flatMap(row => runtimeQuizEvents(row.attempt_id, row.raw_data || {}, row.updated_at))];
}
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
  // Runtime is projected into quiz outcomes server-side; never serialize raw data or launch configuration.
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
  const attemptIds = (result.data || []).map(a => a.id);
  const schoolIds = [...new Set(roster.map(s => s.school_id).filter((id): id is string => !!id))];
  const [games,boards,schools,events] = await Promise.all([
    gameIds.length ? admin.from("games").select("id,name,image_path").in("id",gameIds) : {data:[],error:null},
    pathIds.length ? admin.from("learning_boards").select("id,name").in("id",pathIds) : {data:[],error:null},
    schoolIds.length ? admin.from("schools").select("id,name").in("id",schoolIds) : {data:[],error:null},
    attemptIds.length ? readAll(admin.from("game_score_events").select("id,attempt_id,quiz_id,quiz_attempt,is_correct,speed,created_at").in("attempt_id",attemptIds).in("student_id",ids).order("id")) : [],
  ]);
  checkDb(games.error); checkDb(boards.error); checkDb(schools.error);
  const rows = (result.data || []).map(a=>{const student=roster.find(s=>s.id===a.student_id); const assignment=assignments.find(v=>v.id===a.assignment_id); return {...a,student_name:student?.full_name || student?.email || "Student",school_id:student?.school_id,game_name:games.data?.find(g=>g.id===a.game_id)?.name || "Game unavailable",path_name:boards.data?.find(b=>b.id===assignment?.board_id)?.name || "Individual game"};});
  const reportEvents = await withRuntimeEvents(admin, events as QuizEvent[], attemptIds);
  const enriched = rows.map(row => ({ ...row,
    school_name: schools.data?.find(s => s.id === row.school_id)?.name || "School not assigned",
    image_path: games.data?.find(g => g.id === row.game_id)?.image_path || null,
    ...summarizeQuizzes(reportEvents.filter(event => event.attempt_id === row.id) as QuizEvent[]),
  }));
  return { rows: enriched,total:result.count || 0,page,students:roster };
}

export async function reportAttempt(id: string) {
  const { admin, profile } = await authorize(["super_admin", "admin"]);
  const { data: attempt, error } = await admin.from("attempts")
    .select("id,student_id,game_id,assignment_id").eq("id",uuid(id,"Attempt")).maybeSingle();
  checkDb(error);
  if (!attempt) throw new LmsError("Attempt not found.",404);
  const student = await admin.from("profiles").select("school_id,role").eq("id",attempt.student_id).maybeSingle();
  checkDb(student.error);
  if (!student.data || student.data.role !== "student") throw new LmsError("Student not available.",404);
  if (profile.role !== "super_admin") {
    assertSchool(profile,student.data.school_id);
    const assignment = await admin.from("assignments").select("school_id,student_id")
      .eq("id",attempt.assignment_id || "00000000-0000-0000-0000-000000000000").maybeSingle();
    checkDb(assignment.error);
    if (!assignment.data || assignment.data.student_id !== attempt.student_id) throw new LmsError("Attempt not available to your school.",403);
    assertSchool(profile,assignment.data.school_id);
  }
  const events = await readAll(admin.from("game_score_events")
    .select("id,attempt_id,quiz_id,quiz_attempt,is_correct,speed,created_at")
    .eq("attempt_id",attempt.id).eq("student_id",attempt.student_id).eq("game_id",attempt.game_id)
    .order("created_at").order("id"));
  const reportEvents = await withRuntimeEvents(admin, events as QuizEvent[], [attempt.id]);
  return { events: reportEvents, ...summarizeQuizzes(reportEvents) };
}

// Validate the selected session before resolving its student's assigned materials.
export async function reportMaterials(id: string) {
  await reportAttempt(id);
  const { admin, profile } = await authorize(["super_admin", "admin"]);
  const selected = await admin.from("attempts").select("student_id,assignment_id,game_id").eq("id", uuid(id)).single();
  checkDb(selected.error);
  const attempt = selected.data!;
  const assignment = attempt.assignment_id ? await admin.from("assignments").select("board_id,school_id").eq("id", attempt.assignment_id).single() : null;
  if (assignment) checkDb(assignment.error);
  if (assignment?.data && profile.role !== "super_admin") assertSchool(profile, assignment.data.school_id);
  const student = await admin.from("profiles").select("full_name,email,school_id").eq("id", attempt.student_id).single();
  checkDb(student.error);
  const board = assignment?.data?.board_id;
  const sequence = board ? await admin.from("learning_board_games").select("game_id,sort_order").eq("board_id", board).order("sort_order") : null;
  if (sequence) checkDb(sequence.error);
  const historical = attempt.assignment_id ? await readAll(admin.from("attempts").select("game_id").eq("assignment_id",attempt.assignment_id).eq("student_id",attempt.student_id).order("id")) : [];
  const gameIds = [...new Set([...(sequence?.data?.map(item => item.game_id) || []), attempt.game_id, ...historical.map(item=>item.game_id)])];
  const games = gameIds.length ? await admin.from("games").select("id,name,description,image_path").in("id", gameIds) : { data: [], error: null };
  checkDb(games.error);
  let query = admin.from("attempts").select("id,game_id,attempt_number,started_at").eq("student_id", attempt.student_id);
  query = attempt.assignment_id ? query.eq("assignment_id", attempt.assignment_id) : query.eq("id", id);
  const sessions = await readAll(query.order("started_at", { ascending: false }).order("id"));
  const path = board ? await admin.from("learning_boards").select("name").eq("id", board).single() : null;
  if (path) checkDb(path.error);
  const sessionIds = sessions.map(session => session.id);
  const events = sessionIds.length ? await readAll(admin.from("game_score_events").select("id,attempt_id,quiz_id,quiz_attempt,is_correct,speed,created_at").in("attempt_id", sessionIds).eq("student_id", attempt.student_id).order("created_at").order("id")) : [];
  const reportEvents = await withRuntimeEvents(admin, events as QuizEvent[], sessionIds);
  return { path: path?.data?.name || "Individual game", student: student.data!.full_name || student.data!.email, games: gameIds.map(gameId => ({ ...games.data!.find(game => game.id === gameId)!, events: reportEvents.filter(event => sessions.some(session => session.game_id === gameId && session.id === event.attempt_id)) })).filter(game => game.id) };
}
