export class RequestBodyError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function readJson(request: Request, maxBytes = 512000): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get("content-length"));
  if (length > maxBytes) throw new RequestBodyError("Request data is too large.", 413);
  if (!request.body) throw new RequestBodyError("Invalid request.", 400);
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw new RequestBodyError("Request data is too large.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(); return value; }
  catch { throw new RequestBodyError("Invalid request.", 400); }
}
