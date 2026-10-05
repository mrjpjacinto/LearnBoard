"use client";
import ActionIcon from "@/components/ActionIcon";

import { useEffect, useState } from "react";
export function Notification({ type, message, onClose }: { type: "success" | "error"; message: string; onClose: () => void }) {
  const success = type === "success";
  return <div className="fixed right-4 top-4 z-[200] w-[calc(100%-2rem)] max-w-sm sm:right-5 sm:top-5"><div role={success ? "status" : "alert"} className={"flex items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lg " + (success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800")}><span className="mt-0.5 shrink-0"><ActionIcon name={success ? "check" : "close"} /></span><p className="min-w-0 flex-1 break-words text-sm font-medium leading-5">{message}</p><button type="button" aria-label="Close notification" onClick={onClose} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-black/5"><ActionIcon name="close" /></button></div></div>;
}
export function useToast() {
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), toast.type === "success" ? 3000 : 5000); return () => window.clearTimeout(timer); }, [toast]);
  return { toast, setToast, notification: toast ? <Notification type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null };
}
export async function submitJson(url: string, method: string, body: unknown) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || "Unable to complete the request.");
  return result;
}
