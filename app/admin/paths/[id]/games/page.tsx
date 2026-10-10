import { loadGameClassifications } from "@/lib/lms/game-skills-server";
import { notFound } from "next/navigation";
import { ownedPath, LmsError, checkDb } from "@/lib/lms/auth";
import { Workspace, Card } from "@/components/LmsUi";
import PathGamesEditor from "@/components/PathGamesEditor";
export default async function PathGamesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let auth;
  try { auth = await ownedPath(id); } catch (e) { if (e instanceof LmsError) notFound(); throw e; }
  const { admin, path } = auth;
  const [games, relations, subjects] = await Promise.all([admin.from("games").select("id,name,description,image_path,subject_id,skill_id,status").order("name"), admin.from("learning_board_games").select("game_id,sort_order").eq("board_id", id).order("sort_order"), admin.from("subjects").select("id,name").order("name")]);
  const [individual,classAssignments] = await Promise.all([
    admin.from("assignments").select("id",{count:"exact",head:true}).eq("board_id",id),
    admin.from("learning_board_group_assignments").select("id",{count:"exact",head:true}).eq("board_id",id)
  ]);
  checkDb(individual.error);checkDb(classAssignments.error);
  if(individual.count===null||classAssignments.count===null)throw new LmsError("Unable to check path assignments.",503);
  const assigned=individual.count>0||classAssignments.count>0;
  return <Workspace title="Add & Arrange Games" description={`Choose and order games for ${path.name}. Add, remove, or reorder games. Saved changes apply to assigned students; their history stays saved.`} back={{ href: `/admin/paths/${id}`, label: path.name }}>{games.error || relations.error || subjects.error ? <Card>Unable to load the game library.</Card> : <PathGamesEditor assigned={assigned} pathId={id} updatedAt={path.updated_at} games={await loadGameClassifications(admin,games.data || [])} selected={(relations.data || []).map(r => r.game_id)} subjects={subjects.data || []} />}</Workspace>;
}
