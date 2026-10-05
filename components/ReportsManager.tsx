"use client";
import Link from "next/link";
import ActionIcon from "@/components/ActionIcon";

import { useEffect, useRef, useState } from "react";
import { Card, Empty, Field, inputClass } from "./LmsUi";

type Row = {
  id: string; student_name: string; school_name: string; game_name: string; path_name: string;
  image_path: string | null; attempt_number: number; started_at: string;
  correct: number; incorrect: number; total_attempts: number; correct_quizzes: number;
};
type Option = { id: string; name: string; school_id?: string };
const initial = { school: "", class: "", student: "", path: "", game: "", from: "", until: "" };
const zone = { timeZone: "Asia/Manila" };
const reportInputClass = inputClass.replace("py-3", "py-2");

function ResultsGraph({ correct, incorrect }: { correct: number; incorrect: number }) {
  const total = correct + incorrect;
  if (!total) return <p className="text-xs text-[#667085]">No quiz results recorded</p>;
  return <div className="min-w-40" role="img" aria-label={`${correct} correct, ${incorrect} incorrect`}>
    <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
      <div className="bg-emerald-500" style={{ width: `${correct / total * 100}%` }} />
      <div className="bg-rose-400" style={{ width: `${incorrect / total * 100}%` }} />
    </div>
    <div className="mt-2 flex justify-between gap-3 text-xs"><span className="text-emerald-700">Correct {Math.round(correct / total * 100)}%</span><span className="text-rose-700">Incorrect {100 - Math.round(correct / total * 100)}%</span></div>
  </div>;
}

export default function ReportsManager({ schools, groups, students, boards, games, isSuperAdmin }: {
  isSuperAdmin: boolean; schools: Option[]; groups: Option[]; students: { id: string; full_name: string | null; email: string; school_id: string }[]; boards: Option[]; games: Option[];
}) {
  const [filters, setFilters] = useState(initial), [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]), [total, setTotal] = useState(0), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  const loadMore = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        const query = new URLSearchParams({ ...filters, page: String(page) });
        const response = await fetch(`/api/admin/reports?${query}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load reports.");
        if (!controller.signal.aborted) { setRows(current => page === 1 ? result.rows : [...current, ...result.rows.filter((row: Row) => !current.some(existing => existing.id === row.id))]); setTotal(result.total); }
      } catch (e) { if (!controller.signal.aborted) setError((e as Error).message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load(); return () => controller.abort();
  }, [filters, page]);
  useEffect(() => {
    if (loading || error || rows.length >= total || !loadMore.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); setPage(current => current + 1); }
    }, { rootMargin: "200px" });
    observer.observe(loadMore.current);
    return () => observer.disconnect();
  }, [loading, error, rows.length, total]);
  function updateFilter(key: keyof typeof initial, value: string) {
    setRows([]);
    setPage(1);
    setFilters(current => ({ ...current, [key]: value, ...(key === "school" ? { class: "", student: "", path: "" } : {}) }));
  }
  const select = (label: string, key: keyof typeof initial, options: Option[]) => <Field label={label}><select className={reportInputClass} value={filters[key]} onChange={e => updateFilter(key, e.target.value)}><option value="">All</option>{options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>;
  return <>
    <Card compact>
      <div className={isSuperAdmin ? "grid gap-layout sm:grid-cols-3" : "grid gap-layout sm:grid-cols-2"}>
        {isSuperAdmin && select("School", "school", schools)}
        {select("Student", "student", students.filter(s => !filters.school || s.school_id === filters.school).map(s => ({ id: s.id, name: s.full_name || s.email })))}
        {select("Material", "game", games)}
      </div>
      <details className="mt-3">
        <summary className="w-fit cursor-pointer text-sm font-semibold text-[#6366F1]">More filters</summary>
        <div className="mt-3 grid gap-layout sm:grid-cols-2 xl:grid-cols-4">
          {select("Class", "class", groups.filter(g => !filters.school || g.school_id === filters.school))}
          {select("Learning Path", "path", boards.filter(b => !filters.school || b.school_id === filters.school))}
          <Field label="From"><input type="date" className={reportInputClass} value={filters.from} onChange={e => updateFilter("from", e.target.value)} /></Field>
          <Field label="Through"><input type="date" className={reportInputClass} value={filters.until} onChange={e => updateFilter("until", e.target.value)} /></Field>
        </div>
      </details>
    </Card>
    {error ? <Card className="mt-layout"><p role="alert" className="text-red-700">{error}</p></Card> : loading && !rows.length ? <Card className="mt-layout">Loading reports...</Card> : <>
      {rows.length ? <Card className="mt-layout"><div className="max-h-[65vh] overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 z-10 bg-white text-xs uppercase text-[#667085]"><tr>{[...(isSuperAdmin ? ["School"] : []), "Student", "Date", "Time", "Learning Material", "Correct / Incorrect"].map(h => <th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr className="border-t border-[#E3E8F2]" key={r.id}>
        {isSuperAdmin && <td className="p-3">{r.school_name}</td>}<td className="p-3 font-semibold">{r.student_name}</td><td className="whitespace-nowrap p-3">{new Date(r.started_at).toLocaleDateString("en-PH", zone)}</td><td className="whitespace-nowrap p-3">{new Date(r.started_at).toLocaleTimeString("en-PH", zone)}</td>
        <td className="p-3"><Link href={"/admin/reports/" + r.id} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-[#6366F1] hover:bg-[#EEF0FF]">View<ActionIcon name="next" /></Link></td><td className="p-3"><ResultsGraph correct={r.correct} incorrect={r.incorrect} /></td>
      </tr>)}</tbody></table><div ref={loadMore} className="h-1" />{loading && <p role="status" className="p-3 text-center text-sm text-[#667085]">Loading more reports...</p>}</div></Card> : <Empty title="No learning sessions match these filters" />}
    </>}

  </>;
}

