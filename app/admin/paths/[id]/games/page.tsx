import { notFound } from "next/navigation";
import { ownedPath, LmsError } from "@/lib/lms/auth";
import { Workspace, Card } from "@/components/LmsUi";
import PathGamesEditor from "@/components/PathGamesEditor";
export default async function PathGamesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let auth;
  try { auth = await ownedPath(id); } catch (e) { if (e instanceof LmsError) notFound(); throw e; }
  const { admin, path } = auth;
  const [games, relations, subjects] = await Promise.all([admin.from("games").select("id,name,description,image_path,subject_id,skill_id,status").order("name"), admin.from("learning_board_games").select("game_id,sort_order").eq("board_id", id).order("sort_order"), admin.from("subjects").select("id,name").order("name")]);
  return <Workspace title="Add & Arrange Games" description={`Choose and order games for ${path.name}. Paths with active assignments are protected from sequence changes.`} back={{ href: `/admin/paths/${id}`, label: path.name }}>{games.error || relations.error || subjects.error ? <Card>Unable to load the game library.</Card> : <PathGamesEditor pathId={id} updatedAt={path.updated_at} games={games.data || []} selected={(relations.data || []).map(r => r.game_id)} subjects={subjects.data || []} />}</Workspace>;
}
