"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, secondaryClass } from "./LmsUi";
import { useToast } from "./LmsToast";
export default function ScormPlayer({ attemptId, sessionToken, deadline, initialData, orientation }: { attemptId: string; sessionToken: string; deadline: string | null; initialData: Record<string,string>; orientation: string }) {
  const iframe = useRef<HTMLIFrameElement>(null), raw = useRef(initialData), queue = useRef<Promise<void>>(Promise.resolve()), ending = useRef(false), dirty = useRef(false);
  const [status, setStatus] = useState("Loading game..."), [error, setError] = useState(""), [loaded, setLoaded] = useState(false), [remaining, setRemaining] = useState<number | null>(null), [busy, setBusy] = useState(false), [finished, setFinished] = useState(false);
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
        } catch(e) { ending.current = false; const message = (e as Error).message; setError(message); setStatus("Progress has not saved"); setToast({ type: "error", message }); }
      });
    }
    function receive(event: MessageEvent) {
      if (event.source !== iframe.current?.contentWindow || event.origin !== "null" || !event.data || event.data.channel !== attemptId) return;
      if (event.data.type === "learnboard-ready") { setLoaded(true); setStatus("Game ready"); }
      if (event.data.type === "learnboard-snapshot" && event.data.raw && typeof event.data.raw === "object") { raw.current=event.data.raw; dirty.current=true; }
      if (event.data.type === "learnboard-runtime" && typeof event.data.raw === "object" && event.data.raw && typeof event.data.finish === "boolean") enqueue(event.data.raw, event.data.finish);
    }
    function beacon() { if (!dirty.current || ending.current) return; const body = JSON.stringify({ session_token: sessionToken, raw: raw.current, finish: false }); if (body.length < 60000) navigator.sendBeacon(`/api/student/runtime/${attemptId}`, new Blob([body], { type: "application/json" })); }
    function beforeUnload(e: BeforeUnloadEvent) { if (dirty.current) { e.preventDefault(); beacon(); } }
    const timer = window.setInterval(() => { if (deadlineMs !== null) { const seconds = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)); setRemaining(seconds); if (seconds === 0) { setLoaded(false); setError("Time limit reached. Return to My Learning."); } } }, 1000);
    window.addEventListener("message", receive); window.addEventListener("pagehide", beacon); window.addEventListener("beforeunload", beforeUnload);
    return () => { window.clearInterval(timer); window.removeEventListener("message", receive); window.removeEventListener("pagehide", beacon); window.removeEventListener("beforeunload", beforeUnload); };
  }, [attemptId, sessionToken, deadline, setToast]);
  async function saveAndExit() {
    setBusy(true);
    try { await queue.current.catch(() => {}); if (!ending.current) { const response = await fetch(`/api/student/runtime/${attemptId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_token: sessionToken, raw: raw.current, finish: true }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to save progress."); } router.push("/student"); router.refresh(); }
    catch(e) { setError((e as Error).message); setToast({ type: "error", message: (e as Error).message }); }
    finally { setBusy(false); }
  }
  return <>{notification}<Card><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p aria-live="polite" className="text-sm font-medium text-[#344054]">{status}{remaining !== null ? ` · ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,"0")} remaining` : ""}</p><button className={secondaryClass} disabled={busy} onClick={saveAndExit}>{busy ? "Saving..." : "Save & Return"}</button></div>{error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}<iframe ref={iframe} title="Learning game" src={`/api/student/content/${attemptId}/${sessionToken}/_launch`} sandbox="allow-scripts allow-forms allow-pointer-lock" allow="autoplay; fullscreen" referrerPolicy="no-referrer" className={`mx-auto w-full rounded-xl border border-[#E3E8F2] bg-white ${orientation === "portrait" ? "h-[75vh] max-w-[600px]" : "h-[70vh] min-h-[420px]"} ${remaining === 0 || finished ? "hidden" : ""}`} /><p className="mt-3 text-xs text-[#667085]">{loaded ? "Use the game’s finish or exit control when complete, then return to My Learning." : "If the game does not load, return to My Learning and try again."}</p></Card></>;
}
