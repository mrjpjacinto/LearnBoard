"use client";
import StudentPlayNotice, { type PlayRestrictions } from "./StudentPlayNotice";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "./LmsUi";
import ActionIcon from "./ActionIcon";
import { submitJson, useToast } from "./LmsToast";
export default function StudentLearningCard({ title, image, assignmentId, classAssignmentId, gameId, status, restrictions, unavailableReason }: { status: "Not started" | "In progress"; title: string; image: string | null; assignmentId: string | null; classAssignmentId: string | null; gameId: string | null; restrictions: PlayRestrictions; unavailableReason?: string }) {
  const [busy,setBusy] = useState(false), router = useRouter();
  const {notification,setToast} = useToast();
  async function open() {
    if (busy || !gameId) return;
    setBusy(true);
    try {
      const result = await submitJson("/api/student/launch","POST",{assignment_id:assignmentId,class_assignment_id:classAssignmentId,game_id:gameId});
      router.push(`/student/play/${result.attempt_id}`);
    } catch(e) { setToast({type:"error",message:(e as Error).message}); setBusy(false); }
  }
  return <StudentPlayNotice restrictions={restrictions} busy={busy} onConfirm={open}>{show => <Card className="!overflow-hidden !p-0 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">{notification}
    <button type="button" onClick={show} disabled={busy || !gameId} aria-label={`Open ${title}`} className="group relative block aspect-[4/3] w-full overflow-hidden bg-[#EEF0FF] disabled:cursor-not-allowed">{image ? <img src={image} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : <span className="text-4xl text-[#6366F1]" aria-hidden="true">Play</span>}</button>
    <div className="flex items-center justify-between gap-3 px-4 py-4"><div className="min-w-0"><h2 className="break-words text-base font-semibold text-[#172033]">{title}</h2><p className={`mt-1 text-sm ${status === "In progress" ? "text-[#4F46E5]" : "text-[#667085]"}`}>{status}</p></div><button type="button" disabled={busy || !gameId} onClick={show} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-[#EEF0FF] px-3 py-2 text-sm font-semibold text-[#4F46E5] transition hover:bg-[#E0E4FF] disabled:opacity-50">{busy ? "Opening..." : "Open"}<ActionIcon name="next" /></button></div>
    {!gameId && <p className="px-4 pb-4 text-sm text-[#667085]">{unavailableReason || "No games are available yet."}</p>}
  </Card>}</StudentPlayNotice>;
}
