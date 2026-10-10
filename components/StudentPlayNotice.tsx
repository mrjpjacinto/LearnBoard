"use client";

import { useEffect, useRef, useState } from "react";
import { buttonClass } from "./LmsUi";

export type PlayRestrictions = { allow_resume: boolean; available_until: string | null; max_attempts: number | null };

export default function StudentPlayNotice({ restrictions, busy, onConfirm, children }: { restrictions: PlayRestrictions; busy: boolean; onConfirm: () => void; children: (show: () => void) => React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  const expiration = restrictions.available_until ? new Date(restrictions.available_until).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }) : null;
  return <>{children(() => setOpen(true))}<dialog onClose={() => setOpen(false)} ref={dialog} aria-label="Before you play" className="m-auto max-h-[90dvh] w-[min(480px,calc(100%-32px))] overflow-y-auto rounded-2xl border border-[#E3E8F2] bg-white p-6 text-[#172033] shadow-xl backdrop:bg-slate-900/40">
    <h2 className="text-xl font-bold">Before you play</h2>
    <p className="mt-2 text-sm text-[#667085]">Please review your teacher’s rules before opening this game.</p>
    <div className="my-5 space-y-4 rounded-xl border border-[#E3E8F2] bg-[#F8FAFC] p-4 text-sm">
      <div><p className="font-semibold">{restrictions.max_attempts === 1 ? "One chance per game" : "Game access"}</p><p className="mt-1 text-[#667085]">{restrictions.max_attempts === 1 ? "You cannot start a new chance after using this one." : restrictions.max_attempts ? `Your teacher allows ${restrictions.max_attempts} chances per game.` : "Follow your teacher’s instructions for this game."}</p></div>
      <div><p className="font-semibold">{restrictions.allow_resume ? "You can resume" : "Resume is not allowed"}</p><p className="mt-1 text-[#667085]">{restrictions.allow_resume ? "You can leave and continue the same chance while the assignment is available." : "Stay in the game until you finish. If you leave, you cannot reopen the same chance."}</p></div>
      <div><p className="font-semibold">{expiration ? `Expires ${expiration}` : "No expiration set"}</p><p className="mt-1 text-[#667085]">{expiration ? "Philippine time. After this time, you cannot play or resume, even if you have not finished." : "Your teacher may change when this assignment is available."}</p></div>
    </div>
    <div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={busy} onClick={() => dialog.current?.close()} className="rounded-xl border border-[#D0D5DD] px-4 py-2 font-semibold text-[#344054] hover:bg-[#F9FAFB]">Cancel</button><button type="button" disabled={busy} className={buttonClass} onClick={() => { dialog.current?.close(); onConfirm(); }}>I understand — open game</button></div>
  </dialog></>;
}
