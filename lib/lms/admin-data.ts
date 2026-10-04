import "server-only";
import { pageAuth } from "./auth";
import { assignmentColumns, classAssignmentColumns } from "./types";
export async function assignmentAdminData(boardId?: string) {
  const auth = await pageAuth();
  const { admin, profile } = auth;
  let boards = admin.from("learning_boards").select("id,name,description,status,school_id,updated_at").order("name");
  let groups = admin.from("groups").select("id,name,school_id,is_active").order("name");
  let students = admin.from("profiles").select("id,full_name,email,school_id,is_active").eq("role", "student").order("full_name");
  let assignments = admin.from("assignments").select(assignmentColumns).is("group_assignment_id", null);
  if (profile.role !== "super_admin") { boards = boards.eq("school_id", profile.school_id!); groups = groups.eq("school_id", profile.school_id!); students = students.eq("school_id", profile.school_id!); assignments = assignments.eq("school_id", profile.school_id!); }
  if (boardId) { boards = boards.eq("id", boardId); assignments = assignments.eq("board_id", boardId); }
  const [b, g, s, a, games] = await Promise.all([boards, groups, students, assignments, admin.from("games").select("id,name,status").order("name")]);
  const boardIds = (b.data || []).map(v => v.id);
  const ca = boardIds.length ? await admin.from("learning_board_group_assignments").select(classAssignmentColumns).in("board_id", boardIds) : { data: [], error: null };
  return { ...auth, boards: b.data || [], groups: g.data || [], students: s.data || [], assignments: a.data || [], classAssignments: ca.data || [], games: games.data || [], loadError: [b,g,s,a,games,ca].some(v => v.error) };
}
