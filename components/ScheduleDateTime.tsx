"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass } from "./LmsUi";

function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
export default function ScheduleDateTime({ label, value, onChange, required = false, min, help }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; min?: string; help: string }) {
  const [date = "", time = required ? "23:59" : "09:00"] = value.split("T");
  const [hour, minute] = time.split(":"), period = Number(hour) >= 12 ? "PM" : "AM";
  const [open,setOpen] = useState(false), [month,setMonth] = useState(""), [today,setToday] = useState("");
  const [minuteDraft, setMinuteDraft] = useState<string | null>(null);
  const calendar = useRef<HTMLDivElement>(null);
  const dateButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !calendar.current?.contains(target) && !dateButton.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, [open]);
  const viewed = new Date((month || date || "2000-01-01").slice(0,7)+"-01T12:00:00");
  const first = viewed.getDay(), days = new Date(viewed.getFullYear(),viewed.getMonth()+1,0).getDate();
  const setTime = (h: number, m: string, p: string) => { if(date) onChange(`${date}T${String(h%12+(p==="PM"?12:0)).padStart(2,"0")}:${m}`); };
  function showCalendar() { const current = dateKey(new Date()); setToday(current); setMonth((date || current).slice(0,7)); setOpen(!open); }
  function choose(day: string) { onChange(`${day}T${time}`); setOpen(false); }
  function shortcut(days: number) { const next=new Date(); next.setDate(next.getDate()+days); onChange(`${dateKey(next)}T${required?"23:59":"09:00"}`);setOpen(false); }
  const dateLabel = date ? new Date(date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "Choose a date";
  return <section className="min-w-0 bg-white">
    <h4 className="mb-2 text-sm font-semibold text-[#344054]">{label}{required && <span className="ml-1 text-[#667085]">*</span>}</h4>
    <span className="mb-1 block text-xs text-[#667085]">Date</span>
    <input aria-label={label+" date"} className="sr-only" tabIndex={-1} required={required} value={date} onChange={()=>{}} onInvalid={event=>{event.preventDefault();setToday(dateKey(new Date()));setMonth(dateKey(new Date()).slice(0,7));setOpen(true);}} />
    <div className="relative">
    <button ref={dateButton} type="button" aria-label={label+" date: "+dateLabel} aria-expanded={open} onClick={showCalendar} className={inputClass+" flex w-full items-center justify-between !min-h-10 !py-2 !px-3 text-left"}><span className={date?"":"text-[#667085]"}>{dateLabel}</span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="shrink-0 text-[#6366F1]"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18"/></svg></button>
    {open && <div ref={calendar} className="absolute left-0 top-full z-50 mt-2 w-full min-w-[240px] rounded-xl border border-[#E3E8F2] bg-white p-2 shadow-xl" onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();setOpen(false);dateButton.current?.focus();}}}>
      <div className="mb-2 flex items-center justify-between"><button type="button" aria-label={label+" previous month"} onClick={()=>setMonth(dateKey(new Date(viewed.getFullYear(),viewed.getMonth()-1,1)).slice(0,7))} className="rounded-lg px-3 py-2 hover:bg-slate-100"><span aria-hidden="true">&lt;</span></button><span aria-live="polite" className="text-sm font-semibold">{viewed.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</span><button type="button" aria-label={label+" next month"} onClick={()=>setMonth(dateKey(new Date(viewed.getFullYear(),viewed.getMonth()+1,1)).slice(0,7))} className="rounded-lg px-3 py-2 hover:bg-slate-100"><span aria-hidden="true">&gt;</span></button></div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">{["Su","Mo","Tu","We","Th","Fr","Sa"].map(day=><span key={day} className="py-2 text-[#667085]">{day}</span>)}{Array.from({length:first},(_,i)=><span key={"blank"+i}/>)}{Array.from({length:days},(_,i)=>{const day=dateKey(new Date(viewed.getFullYear(),viewed.getMonth(),i+1));return <button key={day} type="button" aria-label={day} aria-pressed={day===date} aria-current={day===today ? "date" : undefined} disabled={!!min && day<min.slice(0,10)} onClick={()=>choose(day)} className={"min-h-8 rounded-lg font-medium disabled:opacity-25 "+(day===date?"bg-[#6366F1] text-white":day===today?"bg-[#EEF0FF] text-[#4F46E5] ring-1 ring-inset ring-[#818CF8] hover:bg-[#E0E4FF]":"text-[#344054] hover:bg-[#EEF0FF] focus-visible:outline-2 focus-visible:outline-[#6366F1]")}>{i+1}</button>;})}</div>
    </div>}
    </div>
    <div className="mt-3"><span className="mb-1 block text-xs text-[#667085]">Time</span><div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
      <select aria-label={label+" hour"} disabled={!date} value={Number(hour)%12||12} onChange={event=>setTime(Number(event.target.value),minute,period)} className={inputClass+" !w-full min-w-0 !min-h-10 !py-2 !px-2 disabled:opacity-40"}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select><span>:</span>
      <input aria-label={label+" minute"} type="text" inputMode="numeric" maxLength={2} pattern="[0-5][0-9]" required={!!date} disabled={!date} value={minuteDraft ?? minute.padStart(2,"0")} onFocus={event=>{setMinuteDraft(minute.padStart(2,"0"));event.target.select();}} onBlur={()=>setMinuteDraft(null)} onChange={event=>{const next=event.target.value;if(/^\d{0,2}$/.test(next) && Number(next)<60){setMinuteDraft(next);if(next)setTime(Number(hour)%12||12,next.padStart(2,"0"),period);}}} className={inputClass+" !w-full min-w-0 !min-h-10 !py-2 !px-2 disabled:opacity-40"}/>
    </div><div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-[#F1F5F9] p-1">{["AM","PM"].map(p=><button key={p} type="button" aria-pressed={period===p} disabled={!date} onClick={()=>setTime(Number(hour)%12||12,minute,p)} className={"rounded-md py-1.5 text-xs font-semibold disabled:opacity-40 "+(period===p?"bg-white text-[#4F46E5] shadow-sm":"text-[#667085] hover:bg-white/60")}>{p}</button>)}</div></div>
    <div className="mt-3 flex flex-wrap gap-2">{[{label:"Today",days:0},{label:"Tomorrow",days:1},...(required?[{label:"In 1 week",days:7}]:[])].map(choice=><button key={choice.label} type="button" onClick={()=>shortcut(choice.days)} className="rounded-lg bg-[#EEF0FF] px-2.5 py-1.5 text-xs font-medium text-[#4F46E5] hover:bg-[#E0E4FF]">{choice.label}</button>)}{!required && date && <button type="button" onClick={()=>onChange("")} className="rounded-lg px-2 py-1 text-xs text-[#667085] hover:bg-slate-100">Clear</button>}</div>
    <p className="mt-3 text-xs leading-5 text-[#667085]">{help}</p>
  </section>;
}
