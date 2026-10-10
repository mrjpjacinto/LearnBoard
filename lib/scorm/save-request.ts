export async function saveRuntime(url: string, body: unknown, fetcher: typeof fetch = fetch) {
  const response = await fetcher(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Progress could not be saved.");
  return result as { saved: boolean; completion: string; success: string; score: number | null };
}
export function sameRuntime(left: Record<string, string>, right: Record<string, string>) {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right, key) && left[key] === right[key]);
}
