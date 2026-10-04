"use client";
import { useEffect, useState } from "react";
export function useToast() {
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), toast.type === "success" ? 3000 : 5000); return () => window.clearTimeout(timer); }, [toast]);
  return { toast, setToast, notification: toast ? <div className="fixed right-5 top-5 z-[100] w-[calc(100%-2.5rem)] max-w-sm"><div role={toast.type === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-xl border bg-white px-4 py-3.5 shadow-lg ${toast.type === "success" ? "border-emerald-200" : "border-red-200"}`}><p className="flex-1 text-sm font-medium text-[#344054]">{toast.message}</p><button type="button" aria-label="Close notification" onClick={() => setToast(null)} className="text-[#667085]">×</button></div></div> : null };
}
export async function submitJson(url: string, method: string, body: unknown) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || "Unable to complete the request.");
  return result;
}
