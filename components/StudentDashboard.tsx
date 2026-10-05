import Link from "next/link";
import type { StudentLearning } from "@/lib/lms/student-data";
import { learningState, gameImage, learningDate } from "@/lib/lms/student-portal";
import { Workspace, Card, Empty, secondaryClass } from "./LmsUi";
import StudentLearningCard from "./StudentLearningCard";
export default function StudentDashboard({ learning, tab = "Current" }: { name: string; learning: StudentLearning[]; tab?: string }) {
  const tabs = ["Current", "Upcoming", "Completed", "Expired"], selected = tabs.includes(tab) ? tab : "Current";
  const items = learning.filter(item => learningState(item) === selected);
  return <Workspace title="My Learning" description="Your learning adventures, all in one place.">
    <nav aria-label="Learning sections" className="mb-layout flex flex-wrap gap-2">{tabs.map(t => <Link key={t} href={`/student?tab=${t}`} aria-current={t === selected ? "page" : undefined} className={`${secondaryClass} ${t === selected ? "!border-[#6366F1] !bg-[#EEF0FF] !text-[#4F46E5]" : ""}`}>{t} ({learning.filter(l => learningState(l) === t).length})</Link>)}</nav>
    {items.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map(item => {
      const nextGame = item.games.find(g => !item.attempts.some(a => a.game_id === g.id && a.completion_status === "completed"));
      const image = gameImage((nextGame || item.games[0])?.image_path || null);
      if (selected === "Current") return <StudentLearningCard key={item.key} title={item.title} image={image} assignmentId={item.assignmentId} classAssignmentId={item.classAssignmentId} gameId={nextGame?.id || null} />;
      return <Card key={item.key}><div className="mb-4 aspect-[4/3] overflow-hidden rounded-xl bg-[#EEF0FF]">{image && <img src={image} alt="" className="h-full w-full object-cover" />}</div><h2 className="mb-4 text-lg font-bold text-[#172033]">{item.title}</h2>{selected === "Upcoming" ? <p className="text-sm text-[#667085]">Available {item.available_from ? learningDate(item.available_from) : "soon"} - Locked</p> : selected === "Expired" ? <p className="text-sm text-[#667085]">This assignment is closed. Your history is preserved.</p> : <Link href={`/student/scores?learning=${encodeURIComponent(item.key)}`} className={secondaryClass}>View Results</Link>}</Card>;
    })}</div> : <Empty title={`No ${selected.toLowerCase()} learning`}>{selected === "Current" ? "Your teacher's assignments will appear here." : `Your ${selected.toLowerCase()} assignments will appear here.`}</Empty>}
  </Workspace>;
}
