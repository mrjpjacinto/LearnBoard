"use client";
import { useState } from "react";
import Image from "next/image";
import { Card } from "./LmsUi";
import { summarizeQuizzes, type QuizEvent } from "@/lib/lms/quiz-results";
export default function ReportMaterialDetails({ game, path }: { game: { id: string; name: string; image_path: string | null; events: QuizEvent[] }; path: string }) {
  const [failed, setFailed] = useState(false);
  const summary = summarizeQuizzes(game.events);
  const accuracy = summary.total_attempts ? Math.round(summary.correct / summary.total_attempts * 100) : 0;
  const image = game.image_path && (/^https?:\/\//.test(game.image_path) ? game.image_path : process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/game-images/" + game.image_path.split("/").map(encodeURIComponent).join("/"));
  return <section aria-label={game.name} className="grid items-start gap-layout lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
    <Card><div className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">{image && !failed ? <Image unoptimized src={image} width={720} height={540} alt={game.name} onError={() => setFailed(true)} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-[#667085]">No image available</div>}</div>
      <h2 className="mt-4 text-xl font-bold text-[#172033]">{game.name}</h2>
      <dl className="mt-4 divide-y divide-[#E3E8F2]">{[["Total attempts", summary.total_attempts], ["Correct quizzes", summary.correct_quizzes], ["Accuracy", accuracy + "%"]].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 py-3"><dt className="text-sm text-[#667085]">{label}</dt><dd className="text-lg font-semibold text-[#172033]">{value}</dd></div>)}<div className="py-3"><dt className="text-xs font-medium uppercase tracking-wide text-[#667085]">Learning path</dt><dd className="mt-1 break-words text-sm font-semibold text-[#172033]">{path}</dd></div></dl>
    </Card>
    <Card><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold text-[#172033]">Detailed attempt history</h3><span className="text-xs text-[#667085]">{summary.total_attempts} recorded attempts</span></div>
      {game.events.length ? <div className="max-h-[65vh] overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-white text-xs uppercase text-[#667085]"><tr>{["Quiz ID", "Attempts", "Correct", "Speed"].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody>{game.events.map(event => <tr key={event.id} className="border-t border-[#E3E8F2] hover:bg-slate-50"><td className="break-all px-3 py-4 font-medium">{event.quiz_id}</td><td className="px-3 py-4">{event.quiz_attempt}</td><td className="px-3 py-4"><span className={event.is_correct ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"}>{event.is_correct ? "Correct" : "Incorrect"}</span></td><td className="whitespace-nowrap px-3 py-4">{event.speed === null ? "Not recorded" : event.speed + " sec"}</td></tr>)}</tbody></table></div> : <p className="rounded-xl bg-[#F4F7FB] px-4 py-8 text-center text-sm text-[#667085]">No attempts recorded yet.</p>}
    </Card>
  </section>;
}
