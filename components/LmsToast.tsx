"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
export type ToastMessage = { type: "success" | "error" | "warning" | "info"; message: string };
type ToastEntry = ToastMessage & { id: number };
let entries: ToastEntry[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const empty: ToastEntry[] = [];
const timers = new Map<number, ReturnType<typeof setTimeout>>();
function notificationDuration(message: string) {
  const words = message.trim().split(/\s+/).length;
  // Give short feedback 2 seconds, then add reading time for longer messages.
  return Math.min(15000, Math.max(2000, 1000 + words * 300));
}
function emit() { listeners.forEach(listener => listener()); }
function dismiss(id: number) { clearTimeout(timers.get(id)); timers.delete(id); entries = entries.filter(entry => entry.id !== id); emit(); }
export function showToast(toast: ToastMessage) {
  if (!toast.message.trim()) return;
  const existing = entries.find(entry => entry.type === toast.type && entry.message === toast.message);
  const id = existing?.id ?? ++nextId;
  clearTimeout(timers.get(id));
  entries = [...entries.filter(entry => entry.id !== id), { ...toast, id }].slice(-4);
  for (const [timerId, timer] of timers) if (!entries.some(entry => entry.id === timerId)) { clearTimeout(timer); timers.delete(timerId); }
  timers.set(id, setTimeout(() => dismiss(id), notificationDuration(toast.message)));
  emit();
}
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
const styles = { success: "border-emerald-200 bg-[#F7FDFA] text-emerald-800", error: "border-red-200 bg-[#FFFAFA] text-red-800", warning: "border-amber-200 bg-amber-50 text-amber-800", info: "border-blue-200 bg-blue-50 text-blue-800" };
const titles = { success: "Success", error: "Unable to complete", warning: "Please check", info: "Notice" };
export function ToastViewport() {
  const toasts = useSyncExternalStore(subscribe, () => entries, () => empty);
  return <div aria-label="Notifications" className="pointer-events-none fixed right-4 top-4 z-[200] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-5 sm:top-5">{toasts.map(toast => <div key={toast.id} role={toast.type === "error" ? "alert" : "status"} aria-atomic="true" className={"pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lg " + styles[toast.type]}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-5 w-5 shrink-0"><circle cx="12" cy="12" r="9" />{toast.type === "success" ? <path d="m8 12 3 3 5-6" /> : <path d="M12 7v6m0 3v1" />}</svg><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{titles[toast.type]}</p><p className="mt-0.5 break-words text-sm leading-5">{toast.message}</p></div><button type="button" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-current"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div>)}</div>;
}
// Compatibility for existing forms: forward feedback to the app-wide stack.
export function Notification({ type, message }: ToastMessage & { onClose?: () => void }) {
  useEffect(() => { showToast({ type, message }); }, [type, message]);
  return null;
}
export function useToast() {
  const [toast, setLocalToast] = useState<ToastMessage | null>(null);
  const setToast = useCallback((value: ToastMessage | null) => { setLocalToast(value); if (value) showToast(value); }, []);
  return { toast, setToast, notification: null };
}
export async function submitJson(url: string, method: string, body: unknown) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || "Unable to complete the request.");
  return result;
}
