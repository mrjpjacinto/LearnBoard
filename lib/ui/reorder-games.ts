/** Move a game to the target position, preserving every other game's order. */
export function reorderGames(ids: string[], from: string, to: string): string[] {
  const start = ids.indexOf(from), target = ids.indexOf(to);
  if (start < 0 || target < 0 || start === target) return ids;
  const next = [...ids];
  next.splice(start, 1);
  next.splice(target, 0, from);
  return next;
}
