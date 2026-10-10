import ActionIcon from "@/components/ActionIcon";
import { questionHistory } from "@/lib/scorm/question-history";
import StudentScoresTable, { type ScoreRow } from "@/components/StudentScoresTable";
import { liveDetails, savedElapsed } from "@/lib/scorm/live-details";
import { checkDb } from "@/lib/lms/auth";
import { studentLearning } from "@/lib/lms/student-data";
import { learningDate, gameImage, learningState } from "@/lib/lms/student-portal";
import { Workspace, Card, Empty, inputClass, secondaryClass } from "@/components/LmsUi";
export default async function ScoresPage({searchParams}:{searchParams:Promise<{learning?:string}>}) {
  const { learning, admin } = await studentLearning(), filter = (await searchParams).learning;
  const rows = learning.filter(l => !filter || l.key === filter).flatMap(l=>l.attempts.map(a=>({a,l}))).sort((x,y)=>Date.parse(y.a.started_at)-Date.parse(x.a.started_at));
  const records = rows.length ? await admin.from("scorm_runtime_data").select("attempt_id,raw_data").in("attempt_id",rows.map(r=>r.a.id)) : {data:[],error:null};
  checkDb(records.error);
  const grouped: ScoreRow[] = [];
  for (const {a,l} of rows) {
    const id = l.key+":"+a.game_id;
    let row = grouped.find(r=>r.id===id);
    const game = l.games.find(g=>g.id===a.game_id) || l.historicalGames?.find(g=>g.id===a.game_id);
    if (!row) { row={id,title:game?.name || "Game",image:gameImage(game?.image_path || null),learningPath:l.title,resume:l.games.some(g=>g.id===a.game_id) && l.allow_resume && learningState(l)==="Current" && game?.status==="published" && a.can_resume === true && a.has_started ? {restrictions:{allow_resume:l.allow_resume,available_until:l.available_until,max_attempts:l.max_attempts},assignmentId:l.assignmentId,classAssignmentId:l.classAssignmentId,gameId:a.game_id} : null,history:[]}; grouped.push(row); }
    const raw = (records.data?.find(r=>r.attempt_id===a.id)?.raw_data || {}) as Record<string,string>, details=liveDetails(raw), visible=l.score_visible!==false;
    const seconds=savedElapsed(raw) || a.time_spent_seconds || 0;
    const questions = visible ? questionHistory(raw) : [];
    row.history.push({accuracy:!visible ? "Hidden" : details.accuracy===null ? "?" : details.accuracy+"%",id:a.id,date:learningDate(a.completed_at || a.started_at),score:!visible ? "Hidden" : a.score===null ? "Not scored" : Math.round(a.score)+"%",progress:a.completion_status==="completed" ? "Completed" : a.has_started ? "In progress" : "Not started",result:a.success_status==="passed" ? "Passed" : a.success_status==="failed" ? "Not passed" : "Not assessed",correct:visible ? details.correct : null,incorrect:visible ? details.incorrect : null,elapsed:Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0"),questions});
  }
  const grades = rows.map(r=>r.a.score).filter((s):s is number=>s!==null), completed = new Set(rows.filter(r=>r.a.completion_status==="completed").map(r=>r.a.game_id)).size;
  return <Workspace title="My Scores" description="Your scores and learning progress."><div className="stack-layout"><div className="grid gap-5 sm:grid-cols-2">{[["Average Score",grades.length ? `${Math.round(grades.reduce((n,s)=>n+s,0)/grades.length)}%` : "—"],["Games Completed",completed],["Best Score",grades.length ? `${Math.round(Math.max(...grades))}%` : "—"]].map(([label,value])=><Card key={label}><p className="text-sm text-[#667085]">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></Card>)}</div><form className="flex flex-wrap gap-3"><label className="min-w-0 flex-1"><span className="sr-only">Filter by learning</span><select name="learning" defaultValue={filter || ""} className={inputClass}><option value="">All learning</option>{learning.map(l=><option key={l.key} value={l.key}>{l.title}</option>)}</select></label><button className={secondaryClass + " !border-[#DDD6FE] !bg-[#EDE9FE] !text-[#6D28D9]"}><ActionIcon name="filter" />Filter</button></form>{rows.length ? <Card><StudentScoresTable rows={grouped} /></Card> : <Empty title="No results yet">Your attempt history will appear here after you start learning.</Empty>}</div></Workspace>;
}
