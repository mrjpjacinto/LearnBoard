"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ActionIcon from "./ActionIcon";
import { buttonClass, secondaryClass } from "./LmsUi";
import { submitJson, useToast } from "./LmsToast";
import { useCardDrag } from "./useCardDrag";
import { reorderGames } from "@/lib/ui/reorder-games";

type Tile = { id: string; name: string; imageUrl: string | null; subject: string | null; orientation: string };

function TileImage({ game }: { game: Tile }) {
  const [failed, setFailed] = useState(false);
  return <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#EEF0FF]">{game.imageUrl && !failed ? <Image unoptimized draggable={false} src={game.imageUrl} alt={game.name} width={800} height={600} onError={() => setFailed(true)} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-[#667085]">No image available</div>}</div>;
}

export default function PathGameTiles({ pathId, updatedAt, games }: { pathId: string; updatedAt: string; games: Tile[] }) {
  const router = useRouter();
  const [ids, setIds] = useState(games.map(g => g.id));
  const [dragged, setDragged] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { notification, setToast } = useToast();
  const dirty = ids.some((id, i) => id !== games[i]?.id);
  function reorder(from: string, to: string) {
    setIds(current => reorderGames(current, from, to));
    setMessage(`${games.find(g => g.id === from)?.name || "Game"} moved to position ${ids.indexOf(to) + 1}. Save the order to apply it.`);
  }
  function resetDrag() { setDragged(null); setTarget(null); }
  const cardDrag = useCardDrag({ selector: "[data-path-game]", disabled: busy || ids.length < 2, onStart: setDragged, onTarget: setTarget, onDrop: reorder, onEnd: resetDrag });
  async function save() {
    if (busy || !dirty) return;
    setBusy(true);
    try {
      await submitJson(`/api/admin/paths/${pathId}/games`, "PUT", { game_ids: ids, expected_updated_at: updatedAt });
      setToast({ type: "success", message: "Game order saved." });
      router.refresh();
    } catch (e) { setToast({ type: "error", message: (e as Error).message }); }
    finally { setBusy(false); }
  }
  return <div className="p-5 sm:p-6">{notification}
    <p className="mb-layout text-sm text-[#667085]">Press and hold a tile to drag it into place, then save the order.</p>
    <p role="status" className="sr-only">{message}</p>
    <ol className="grid grid-cols-1 gap-layout sm:grid-cols-2 lg:grid-cols-3">
      {ids.map((id, index) => {
        const game = games.find(g => g.id === id)!;
        return <li key={id} data-path-game={id} data-sort-id={id} {...cardDrag(id)} tabIndex={0} aria-label={`Reorder ${game.name}. Hold to drag or use arrow keys.`}
          onKeyDown={e => { const next = index + (e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0); if (!busy && next !== index && ids[next]) { e.preventDefault(); reorder(id, ids[next]); } }}
          className={`min-w-0 touch-none select-none rounded-2xl border bg-white p-3 shadow-sm transition ${target === id ? "border-[#6366F1] ring-2 ring-[#6366F1]/30" : "border-[#E3E8F2]"} ${dragged === id ? "opacity-50" : ""}`}>
          <TileImage game={game} />
          <div className="mt-3 flex items-start gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-xs font-bold text-[#4F46E5]">{index + 1}</span><h3 className="min-w-0 break-words text-sm font-bold text-[#172033]">{game.name}</h3></div>
        </li>;
      })}
    </ol>
    {dirty && <div className="mt-layout flex flex-wrap items-center gap-3"><button type="button" className={buttonClass} disabled={busy} onClick={save}><ActionIcon name="save" />{busy ? "Saving..." : "Save Order"}</button><button type="button" className={secondaryClass} disabled={busy} onClick={() => { setIds(games.map(g => g.id)); setMessage("Original order restored."); }}><ActionIcon name="close" />Cancel</button></div>}
  </div>;
}
