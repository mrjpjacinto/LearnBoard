"use client";
import { useEffect, useRef } from "react";
import type { PointerEvent, MouseEvent } from "react";

/** Hold a card to reorder it; short clicks still open the card. */
export function useCardDrag({ selector, disabled, onStart, onTarget, onDrop, onEnd }: {
  selector: string; disabled: boolean; onStart: (id: string) => void;
  onTarget: (id: string) => void; onDrop: (from: string, to: string) => void; onEnd: () => void;
}) {
  const pending = useRef<{ timer: ReturnType<typeof setTimeout> | null; id: string; target: string; x: number; y: number; active: boolean; element: HTMLElement; pointer: number } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => () => { if (pending.current?.timer) clearTimeout(pending.current.timer); }, []);
  function finish(cancel: boolean) {
    const current = pending.current;
    if (!current) return;
    if (current.timer) clearTimeout(current.timer);
    pending.current = null;
    if (current.element.hasPointerCapture(current.pointer)) current.element.releasePointerCapture(current.pointer);
    if (current.active) {
      suppressClick.current = true;
      if (!cancel && current.id !== current.target) onDrop(current.id, current.target);
      onEnd();
    }
  }
  return (id: string) => ({
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (disabled || e.button !== 0) return;
      suppressClick.current = false;
      const element = e.currentTarget;
      const current = { timer: null as ReturnType<typeof setTimeout> | null, id, target: id, x: e.clientX, y: e.clientY, active: false, element, pointer: e.pointerId };
      pending.current = current;
      current.timer = setTimeout(() => {
        if (pending.current !== current) return;
        current.active = true; element.setPointerCapture(current.pointer); suppressClick.current = true; onStart(id);
      }, 450);
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const current = pending.current;
      if (!current || current.pointer !== e.pointerId) return;
      if (!current.active) {
        if (Math.hypot(e.clientX - current.x, e.clientY - current.y) > 8) {
          if (current.timer) clearTimeout(current.timer);
          current.timer = null;
          if (e.pointerType !== "mouse") { window.scrollBy(0, current.y - e.clientY); current.y = e.clientY; suppressClick.current = true; }
        }
        return;
      }
      e.preventDefault();
      const tile = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>(selector);
      const target = tile?.getAttribute("data-sort-id");
      if (target) { current.target = target; onTarget(target); }
      if (e.clientY < 60) window.scrollBy(0, -12);
      else if (e.clientY > window.innerHeight - 60) window.scrollBy(0, 12);
    },
    onPointerUp() { finish(false); },
    onPointerCancel() { finish(true); },
    onLostPointerCapture() { finish(true); },
    onClickCapture(e: MouseEvent<HTMLElement>) { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; } },
    onContextMenu(e: MouseEvent<HTMLElement>) { e.preventDefault(); },
  });
}
