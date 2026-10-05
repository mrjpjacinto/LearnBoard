"use client";
import { useState } from "react";
import ReportMaterialDetails from "./ReportMaterialDetails";
import { Field, inputClass, Card } from "./LmsUi";
import type { QuizEvent } from "@/lib/lms/quiz-results";
type Material = { id: string; name: string; image_path: string | null; events: QuizEvent[] };
export default function ReportMaterials({ games, path }: { games: Material[]; path: string }) {
  const [selected, setSelected] = useState(games[0]?.id || "");
  const game = games.find(item => item.id === selected) || games[0];
  if (!game) return <Card>No learning materials available.</Card>;
  return <div className="space-y-layout">
    {games.length > 1 && <div className="flex flex-wrap items-end gap-3"><div className="w-full sm:max-w-sm"><Field label="Project"><select className={inputClass} value={game.id} onChange={event => setSelected(event.target.value)}>{games.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.name}</option>)}</select></Field></div><p className="pb-3 text-sm text-[#667085]">Project {games.findIndex(item => item.id === game.id) + 1} of {games.length}</p></div>}
    <ReportMaterialDetails key={game.id} game={game} path={path} />
  </div>;
}
