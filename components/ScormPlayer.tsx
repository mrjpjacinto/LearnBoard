"use client";
import { liveDetails } from "@/lib/scorm/live-details";
import ActionIcon from "@/components/ActionIcon";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./LmsToast";
export default function ScormPlayer({ attemptId, sessionToken, deadline, initialData, scoreVisible = true }: { attemptId: string; sessionToken: string; deadline: string | null; scoreVisible?: boolean; initialData: Record<string,string> }) {
  const iframe = useRef<HTMLIFrameElement>(null), raw = useRef(initialData), queue = useRef<Promise<void>>(Promise.resolve()), ending = useRef(false), dirty = useRef(false);
  const [status, setStatus] = useState("Loading game..."), [error, setError] = useState(""), [loaded, setLoaded] = useState(false), [remaining, setRemaining] = useState<number | null>(null), [busy, setBusy] = useState(false), [finished, setFinished] = useState(false);
  const startedAt = useRef<number | null>(null);
  const [started,setStarted] = useState(false);
  const [details,setDetails] = useState(()=>liveDetails(initialData));
  const [elapsed,setElapsed] = useState(0);
  const { notification, setToast } = useToast(); const router = useRouter();
  useEffect(() => {
    const deadlineMs = deadline ? Date.parse(deadline) : null;
    function enqueue(data: Record<string,string>, finish: boolean) {
      dirty.current = true; raw.current = data;
      if (ending.current) return;
      if (finish) ending.current = true;
      queue.current = queue.current.catch(() => {}).then(async () => {
        try {
          setStatus("Saving progress...");
          const response = await fetch(`/api/student/runtime/${attemptId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_token: sessionToken, raw: data, finish }) });
          const result = await response.json();
          iframe.current?.contentWindow?.postMessage({ type: "learnboard-save-result", channel: attemptId, ok: response.ok }, "*");
          if (!response.ok) throw new Error(result.error || "Progress could not be saved.");
          if(raw.current === data) dirty.current = false; setError(""); setStatus(result.completion === "completed" ? `Completed${result.score !== null ? ` · ${Math.round(result.score)}%` : ""} · ${result.success === "unknown" ? "Not assessed" : result.success}` : "Progress saved");
          if (finish) { setFinished(true); setToast({ type: "success", message: "Progress saved. You can return to My Learning." }); setLoaded(false); }
        } catch(e) { ending.current = false; const message = (e as Error).message; setError(message); setStatus("Progress could not be saved"); setToast({ type: "error", message }); }
      });
    }
    function receive(event: MessageEvent) {
      if (event.source !== iframe.current?.contentWindow || event.origin !== "null" || !event.data || event.data.channel !== attemptId) return;
      if (event.data.type === "learnboard-game-start" && startedAt.current === null) { startedAt.current = Date.now(); setStarted(true); }
      if (event.data.type === "learnboard-ready") { setLoaded(true); setStatus("Game ready"); }
      if (event.data.type === "learnboard-snapshot" && event.data.raw && typeof event.data.raw === "object") { raw.current=event.data.raw; dirty.current=true; }
      if (event.data.type === "learnboard-runtime" && typeof event.data.raw === "object" && event.data.raw && typeof event.data.finish === "boolean") enqueue(event.data.raw, event.data.finish);
    }
    function beacon() { if (!dirty.current || ending.current) return; const body = JSON.stringify({ session_token: sessionToken, raw: raw.current, finish: false }); if (body.length < 60000) navigator.sendBeacon(`/api/student/runtime/${attemptId}`, new Blob([body], { type: "application/json" })); }
    function beforeUnload(e: BeforeUnloadEvent) { if (dirty.current) { e.preventDefault(); beacon(); } }
    const timer = window.setInterval(() => { setDetails(liveDetails(raw.current)); if (startedAt.current !== null && !ending.current) setElapsed(Math.floor((Date.now()-startedAt.current)/1000)); if (deadlineMs !== null) { const seconds = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)); setRemaining(seconds); if (seconds === 0) { setLoaded(false); setError("Time limit reached. Return to My Learning."); } } }, 1000);
    window.addEventListener("message", receive); window.addEventListener("pagehide", beacon); window.addEventListener("beforeunload", beforeUnload);
    return () => { window.clearInterval(timer); window.removeEventListener("message", receive); window.removeEventListener("pagehide", beacon); window.removeEventListener("beforeunload", beforeUnload); };
  }, [attemptId, sessionToken, deadline, setToast]);
  async function saveAndExit() {
    if (busy) return;
    if (deadline && Date.parse(deadline) <= Date.now()) { router.push("/student"); router.refresh(); return; }
    setBusy(true);
    try { await queue.current.catch(() => {}); if (!ending.current) { const response = await fetch(`/api/student/runtime/${attemptId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_token: sessionToken, raw: raw.current, finish: true }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to save progress."); } router.push("/student"); router.refresh(); }
    catch(e) { setError((e as Error).message); setToast({ type: "error", message: (e as Error).message }); }
    finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-50 flex h-dvh w-screen flex-col items-center gap-3 overflow-y-auto bg-[#101828] p-3 md:flex-row md:justify-center md:overflow-hidden md:p-3">
    {notification}
    <button type="button" aria-label={busy ? "Saving progress and exiting" : "Save progress and return to My Learning"} title="Return to My Learning" disabled={busy} onClick={saveAndExit} className="absolute right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-[#263248] text-[#E0E7FF] shadow-lg transition hover:-translate-y-0.5 hover:border-[#A5B4FC] hover:bg-[#6366F1] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50 sm:right-6">{busy ? <ActionIcon name="refresh" className="h-5 w-5 animate-spin" /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><path d="m3 10 9-7 9 7M5 9v11h14V9M9 20v-7h6v7" /></svg>}</button>
    <p aria-live="polite" className="sr-only">{status}</p>
    <div className="relative aspect-[4/3] shrink-0 w-[min(calc(100vw-1.5rem),calc((100dvh-2rem)*4/3))] overflow-hidden rounded-xl bg-white shadow-[0_20px_80px_rgba(0,0,0,0.4)] md:w-[min(calc(100vw-clamp(13rem,20vw,24rem)-2.25rem),calc((100dvh-1.5rem)*4/3))]">
    {remaining !== 0 && !finished && <iframe ref={iframe} title="Learning game" src={`/api/student/content/${attemptId}/${sessionToken}/_launch`} sandbox="allow-scripts allow-forms allow-pointer-lock" allow="autoplay; fullscreen" referrerPolicy="no-referrer" className="block h-full w-full border-0 bg-white" />}
    {!loaded && !finished && !error && <div role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white text-sm text-[#667085]">Loading game...</div>}
    {finished && <div className="absolute inset-0 flex items-center justify-center p-8 text-center"><div><h1 className="text-xl font-bold text-[#172033]">Progress saved</h1><p className="mt-2 text-sm text-[#667085]">Use the home icon to return to My Learning.</p></div></div>}
    </div>
    <aside className="w-full shrink-0 rounded-2xl border border-white/10 bg-[#1D2939] p-4 text-white md:max-h-[calc(100dvh-1.5rem)] md:w-[clamp(13rem,20vw,24rem)] md:self-center min-[2200px]:p-6">
      <h2 className="mb-3 pr-8 text-lg font-semibold min-[2200px]:text-xl">Game Details</h2>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-1">{[["Question",started ? details.question : 0],["Correct answers",scoreVisible ? details.correct : "Hidden"],["Incorrect answers",scoreVisible ? details.incorrect : "Hidden"],["Time elapsed",Math.floor(elapsed/60)+":"+String(elapsed%60).padStart(2,"0")],["Accuracy",scoreVisible ? details.accuracy===null ? "0%" : details.accuracy+"%" : "Hidden"],["Average answer time",details.averageSeconds===null ? "0 sec" : details.averageSeconds+" sec"]].map(([label,value])=><div key={label} className="min-w-0 border-b border-white/10 pb-2"><dt className="text-xs text-[#CBD5E1] min-[2200px]:text-sm">{label}</dt><dd className="mt-1 break-words text-lg font-semibold min-[2200px]:text-xl min-[2800px]:text-2xl">{value}</dd></div>)}</dl>
      <p className="mt-3 text-xs leading-4 text-[#CBD5E1]">Question details update when the game reports quiz interactions.</p>
    </aside>
    {error && <p role="alert" className="absolute inset-x-4 bottom-4 z-40 mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
  </div>;
}
