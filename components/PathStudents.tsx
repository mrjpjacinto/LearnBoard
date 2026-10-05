"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ActionIcon from "./ActionIcon";
import { buttonClass, secondaryClass, inputClass } from "./LmsUi";
import { submitJson } from "./LmsToast";
type Student = { id: string; full_name: string | null; email: string; is_active: boolean };
type Assignment = { id: string; student_id: string; status: string; available_until: string | null; group_assignment_id: string | null };
export default function PathStudents({ pathId, active }: { pathId: string; active: boolean }) {
  const [students,setStudents] = useState<Student[]>([]), [assignments,setAssignments] = useState<Assignment[]>([]), [loaded,setLoaded] = useState(false), [error,setError] = useState(""), [message,setMessage] = useState(""), [editing,setEditing] = useState(false), [search,setSearch] = useState(""), [selected,setSelected] = useState<string[]>([]), [busy,setBusy] = useState(false);
  const [now,setNow] = useState(0);
  const router = useRouter();
  const load = useCallback(async (clearError = true) => {
    try { const response = await fetch(`/api/admin/paths/${pathId}/students`,{cache:"no-store"}); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to load students."); setNow(Date.now()); setStudents(data.students); setAssignments(data.assignments); setLoaded(true); if (clearError) setError(""); }
    catch(e) { setError((e as Error).message); }
  },[pathId]);
  useEffect(()=>{void Promise.resolve().then(()=>load());},[load]);
  const assigned = new Set(assignments.filter(a=>["active","scheduled"].includes(a.status) && (!a.available_until || Date.parse(a.available_until)>now)).map(a=>a.student_id));
  const eligible = students.filter(s=>s.is_active && !assigned.has(s.id));
  async function save() {
    setBusy(true); setError(""); setMessage(""); let saved = 0;
    try {
      for (const target of selected) {
        await submitJson("/api/admin/assignments","POST",{kind:"student",board_id:pathId,target_id:target,available_from:null,available_until:null,max_attempts:null,time_limit_minutes:null,passing_score:70,allow_resume:true,status:"active"}); saved++;
      }
      setMessage(`${saved} ${saved===1 ? "student assigned" : "students assigned"}.`); setEditing(false); setSelected([]);
    } catch(e) { setError(`${saved ? `${saved} students were assigned. ` : ""}${(e as Error).message}`); setSelected(selected.slice(saved)); }
    finally { await load(false); setBusy(false); router.refresh(); }
  }
  return <section className="rounded-2xl border border-[#E3E8F2] bg-white p-5 text-[#172033] shadow-sm"><h2 className="text-base font-bold">Assigned Students <span className="text-[#667085]">({assigned.size})</span></h2><p className="mt-2 text-xs leading-5 text-[#667085]">Assign this path to students in its school. Games must be published and ready to play.</p>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="mt-3 text-sm text-green-700">{message}</p>}{!loaded ? <button className={`${secondaryClass} mt-3`} onClick={()=>void load()}>{error ? "Retry" : "Loading students…"}</button> : <><ul className="my-3 max-h-48 space-y-2 overflow-y-auto text-sm">{students.filter(s=>assigned.has(s.id)).map(s=><li key={s.id} className="break-words rounded-lg bg-[#F4F7FB] px-3 py-2">{s.full_name || s.email}</li>)}</ul>{!assigned.size && <p className="my-3 text-sm text-[#667085]">No students assigned yet.</p>}{editing ? <div className="space-y-3"><input aria-label="Search students" placeholder="Search students…" className={inputClass} value={search} onChange={e=>setSearch(e.target.value)} /><button disabled={busy} className={secondaryClass} onClick={()=>setSelected(eligible.map(s=>s.id))}><ActionIcon name="check" />Select all students</button><div className="max-h-56 space-y-2 overflow-y-auto">{eligible.filter(s=>`${s.full_name || ""} ${s.email}`.toLowerCase().includes(search.toLowerCase())).map(s=><label key={s.id} className="flex items-center gap-2 rounded-lg border border-[#E3E8F2] p-2 text-sm"><input type="checkbox" disabled={busy} checked={selected.includes(s.id)} onChange={e=>setSelected(e.target.checked ? [...selected,s.id] : selected.filter(id=>id!==s.id))} /><span className="min-w-0 break-words">{s.full_name || s.email}</span></label>)}</div>{!eligible.length && <p className="text-sm text-[#667085]">All active students are already assigned.</p>}<button disabled={busy || !selected.length} className={`${buttonClass} w-full`} onClick={save}><ActionIcon name="save" />{busy ? "Assigning…" : `Assign Selected (${selected.length})`}</button><button disabled={busy} className={`${secondaryClass} w-full`} onClick={()=>setEditing(false)}>Cancel</button></div> : <button disabled={!active || busy} className={`${buttonClass} w-full`} onClick={()=>setEditing(true)}><ActionIcon name="add" />Assign Students</button>}{!active && <p className="mt-2 text-xs text-[#667085]">Activate this path before assigning students.</p>}</>}</section>;
}
