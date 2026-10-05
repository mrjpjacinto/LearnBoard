import "server-only";
import { authorize, checkDb, LmsError } from "./auth";
import { permittedAttempts } from "./student-portal";
import { attemptColumns, type Assignment, type ClassAssignment, type Attempt, type Game, type LearningPath, type Schedule } from "./types";
export type StudentLearning = Schedule & { key: string; assignmentId: string | null; classAssignmentId: string | null; title: string; description: string | null; className: string | null; games: Game[]; attempts: Attempt[]; boardId: string | null };
export async function studentLearning() {
  const auth = await authorize(["student"]);
  const { admin, profile } = auth;
  const [assigned, memberships, attemptsResult] = await Promise.all([
    admin.from("assignments").select("*").eq("student_id", profile.id).eq("school_id", profile.school_id!),
    admin.from("group_members").select("group_id").eq("user_id", profile.id),
    admin.from("attempts").select(attemptColumns).eq("student_id", profile.id).order("started_at", { ascending: false }),
  ]);
  [assigned, memberships, attemptsResult].forEach(r => checkDb(r.error));
  const groupIds = (memberships.data || []).map(m => m.group_id);
  const groupsResult = groupIds.length ? await admin.from("groups").select("id,name").eq("school_id", profile.school_id!).eq("is_active", true).in("id", groupIds) : { data: [], error: null };
  checkDb(groupsResult.error);
  const groups = groupsResult.data || [];
  const classResult = groups.length ? await admin.from("learning_board_group_assignments").select("*").in("group_id", groups.map(g => g.id)) : { data: [], error: null };
  checkDb(classResult.error);
  const assignments = (assigned.data || []) as Assignment[];
  const classes = (classResult.data || []) as ClassAssignment[];
  const historicalIds = assignments.filter(a => a.group_assignment_id && !classes.some(c => c.id === a.group_assignment_id)).map(a => a.group_assignment_id!);
  if (historicalIds.length) {
    const historical = await admin.from("learning_board_group_assignments").select("*").in("id", historicalIds);
    checkDb(historical.error);
    for (const source of (historical.data || []) as ClassAssignment[]) {
      // A materialized own-school assignment is a historical entitlement, not
      // permission to launch after leaving a class. Runtime still checks membership.
      classes.push({ ...source, status: "expired" });
    }
  }
  const boardIds = [...new Set([...assignments.map(a => a.board_id), ...classes.map(a => a.board_id)].filter((id): id is string => !!id))];
  const [boardsResult, relationsResult] = boardIds.length ? await Promise.all([
    admin.from("learning_boards").select("id,name,description,status,school_id,updated_at").in("id", boardIds).or(`school_id.eq.${profile.school_id},school_id.is.null`),
    admin.from("learning_board_games").select("board_id,game_id,sort_order").in("board_id", boardIds).order("sort_order"),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  checkDb(boardsResult.error); checkDb(relationsResult.error);
  const boards = (boardsResult.data || []) as LearningPath[];
  const relations = relationsResult.data || [];
  const gameIds = [...new Set([...assignments.map(a => a.game_id), ...relations.map(r => r.game_id)].filter((id): id is string => !!id))];
  const gamesResult = gameIds.length ? await admin.from("games").select("id,name,description,image_path,subject_id,skill_id,status").in("id", gameIds) : { data: [], error: null };
  checkDb(gamesResult.error);
  const games = (gamesResult.data || []) as Game[], attempts = (attemptsResult.data || []) as Attempt[];
  const pathGames = (boardId: string) => relations.filter(r => r.board_id === boardId).map(r => games.find(g => g.id === r.game_id)).filter((g): g is Game => !!g);
  const learning: StudentLearning[] = [];
  for (const a of assignments.filter(a => !a.group_assignment_id)) {
    const board = boards.find(b => b.id === a.board_id), game = games.find(g => g.id === a.game_id);
    if (!board && !game) continue;
    learning.push({ ...a, key: `student:${a.id}`, assignmentId: a.id, classAssignmentId: null, title: board?.name || game!.name, description: board?.description || game?.description || null, className: null, games: board ? pathGames(board.id) : [game!], attempts: attempts.filter(t => t.assignment_id === a.id), boardId: board?.id || null });
  }
  for (const source of classes) {
    const board = boards.find(b => b.id === source.board_id);
    if (!board) continue;
    const materialized = assignments.find(a => a.group_assignment_id === source.id);
    learning.push({ ...source, key: `class:${source.id}`, assignmentId: materialized?.id || null, classAssignmentId: source.id, title: board.name, description: board.description, className: groups.find(g => g.id === source.group_id)?.name || null, games: pathGames(board.id), attempts: materialized ? attempts.filter(t => t.assignment_id === materialized.id) : [], boardId: board.id });
  }
  for (const item of learning) item.attempts = permittedAttempts(item.attempts, item.score_visible);
  return { ...auth, learning };
}
export async function studentAssignment(assignmentId: string) {
  const data = await studentLearning();
  const learning = data.learning.find(l => l.assignmentId === assignmentId);
  if (!learning) throw new LmsError("This assignment is not available.", 403);
  return { ...data, learning };
}
