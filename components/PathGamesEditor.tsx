"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/lms/types";
import { Card, Empty, buttonClass, secondaryClass, inputClass } from "./LmsUi";
import { lightAddButtonClass } from "@/lib/ui/buttons";
import ActionIcon from "./ActionIcon";
import { useToast, submitJson } from "./LmsToast";

function LibraryImage({ game }: { game: Game }) {
  const [failed, setFailed] = useState(false);
  const image = game.image_path && (/^https?:\/\//.test(game.image_path) ? game.image_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/game-images/${game.image_path.split("/").map(encodeURIComponent).join("/")}`);
  return <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#EEF0FF]">{image && !failed ? <Image unoptimized src={image} alt={game.name} width={800} height={600} onError={() => setFailed(true)} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-[#667085]">No image available</div>}</div>;
}
export default function PathGamesEditor({ pathId, updatedAt, games, selected, subjects }: { pathId: string; updatedAt: string; games: Game[]; selected: string[]; subjects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [ids, setIds] = useState(selected), [search, setSearch] = useState(""), [subject, setSubject] = useState("all"), [busy, setBusy] = useState(false);
  const { notification, setToast } = useToast();
  function move(index: number, delta: number) {
    setIds(current => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next;
    });
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      await submitJson(`/api/admin/paths/${pathId}/games`, "PUT", { game_ids: ids, expected_updated_at: updatedAt });
      setToast({ type: "success", message: "Game sequence saved." });
      router.push(`/admin/paths/${pathId}`);
    } catch (e) { setToast({ type: "error", message: (e as Error).message }); setBusy(false); }
  }
  const shown = games.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) && (subject === "all" || g.subject_id === subject));
  return <>{notification}<div className="grid items-start gap-layout lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.6fr)]">
    <Card><h2 className="mb-4 text-lg font-bold text-[#172033]">Game Sequence ({ids.length})</h2>
      {ids.length ? <ol className="stack-layout">{ids.map((id, i) => {
        const name = games.find(g => g.id === id)?.name || "Unavailable game";
        return <li key={id} className="flex min-w-0 items-center gap-2 rounded-xl border border-[#E3E8F2] p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-sm font-bold text-[#4F46E5]">{i + 1}</span>
          <span title={name} className="min-w-0 flex-1 truncate text-sm font-semibold text-[#344054]">{name}</span>
          <div className="flex shrink-0 gap-1"><button type="button" className={`${secondaryClass} w-9 px-0`} aria-label={`Move ${name} up`} title="Move up" disabled={busy || i === 0} onClick={() => move(i, -1)}><ActionIcon name="up" /></button><button type="button" className={`${secondaryClass} w-9 px-0`} aria-label={`Move ${name} down`} title="Move down" disabled={busy || i === ids.length - 1} onClick={() => move(i, 1)}><ActionIcon name="down" /></button><button type="button" className={`${secondaryClass} w-9 px-0 text-red-700`} aria-label={`Remove ${name}`} title="Remove game" disabled={busy} onClick={() => setIds(current => current.filter(v => v !== id))}><ActionIcon name="delete" /></button></div>
        </li>;
      })}</ol> : <Empty title="No games selected">Add materials from the library on the right.</Empty>}
      <button type="button" className={`${buttonClass} mt-layout w-full`} disabled={busy} onClick={save}><ActionIcon name="save" />{busy ? "Saving..." : "Save Sequence"}</button>
    </Card>
    <Card><h2 className="mb-4 text-lg font-bold text-[#172033]">Games Library</h2><div className="mb-4 grid gap-layout sm:grid-cols-2"><input className={inputClass} aria-label="Search games" placeholder="Search games..." disabled={busy} value={search} onChange={e => setSearch(e.target.value)} /><select className={inputClass} aria-label="Subject" disabled={busy} value={subject} onChange={e => setSubject(e.target.value)}><option value="all">All Subjects</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      {shown.length ? <div className="grid grid-cols-1 gap-layout sm:grid-cols-2 2xl:grid-cols-3">{shown.map(g => {
        const added = ids.includes(g.id);
        return <article key={g.id} className="flex min-w-0 flex-col rounded-2xl border border-[#E3E8F2] bg-white p-3 shadow-sm"><LibraryImage game={g} /><h3 className="mb-3 mt-3 break-words text-base font-bold text-[#172033]">{g.name}</h3><button type="button" className={`${lightAddButtonClass} mt-auto w-full`} aria-label={`${added ? "Added" : "Add"} ${g.name}`} disabled={busy || added || ids.length >= 200} onClick={() => setIds(current => current.includes(g.id) || current.length >= 200 ? current : [...current, g.id])}><ActionIcon name={added ? "check" : "add"} />{added ? "Added" : "Add Game"}</button></article>;
      })}</div> : <Empty title="No games match these filters" />}
    </Card>
  </div></>;
}
