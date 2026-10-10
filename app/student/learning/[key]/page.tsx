import { notFound } from "next/navigation";
import { studentLearning } from "@/lib/lms/student-data";
import { learningState, gameImage, completedGames } from "@/lib/lms/student-portal";
import { Workspace, Card, Badge } from "@/components/LmsUi";
import LaunchLearningButton from "@/components/LaunchLearningButton";
export default async function LearningDetail({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params, { learning } = await studentLearning(), item = learning.find(l => l.key === decodeURIComponent(key));
  if (!item) notFound();
  const state = learningState(item);
  if (state === "Upcoming" || state === "Expired") return <Workspace title={item.title} description="This learning is currently locked." back={{href:"/student",label:"My Learning"}}><Card>{state === "Upcoming" ? "Your learning will open at its scheduled start time." : "This assignment has closed. Ask your teacher about extending it."}</Card></Workspace>;
  if (!item.games.length) return <Workspace title={item.title} description="Your learning path is ready for new activities." back={{href:"/student",label:"My Learning"}}><Card>Your teacher will add games here. Your previous results remain available in My Scores.</Card></Workspace>;
  return <Workspace title={item.title} description={`${completedGames(item)} of ${item.games.length} games completed`} back={{href:"/student",label:"My Learning"}}><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{item.games.map((game,index) => {
    const history = item.attempts.filter(a => a.game_id === game.id), done = history.some(a => a.completion_status === "completed"), resume = item.allow_resume && history.some(a => a.can_resume === true), unlocked = done || resume || item.games.slice(0,index).every(g => item.attempts.some(a => a.game_id === g.id && a.completion_status === "completed")), limited = !resume && item.max_attempts !== null && history.length >= item.max_attempts, image = gameImage(game.image_path);
    return <Card key={game.id}><div className="mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-[#EEF0FF]">{image && <img src={image} alt="" className="h-full w-full object-cover" />}</div><h2 className="mb-3 font-bold">{index+1}. {game.name}</h2>{done ? <Badge>Completed</Badge> : <LaunchLearningButton restrictions={item} assignmentId={item.assignmentId} classAssignmentId={item.classAssignmentId} gameId={game.id} disabled={!unlocked || limited || game.status !== "published"} label={!unlocked ? "Locked" : limited ? "Attempt limit reached" : resume ? "Continue" : "Play"} />}</Card>;
  })}</div></Workspace>;
}
