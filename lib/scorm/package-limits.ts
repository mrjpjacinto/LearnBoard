import type { Readable } from "node:stream";
import type { JSZipObject } from "jszip";
export const packageLimits = { files: 5000, manifestBytes: 2 * 1024 * 1024, fileBytes: 64 * 1024 * 1024, totalBytes: 512 * 1024 * 1024 };
// Stop decompression before retaining an oversized entry in memory.
export function readZipEntry(entry: JSZipObject, limit: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []; let bytes = 0, failed = false;
    const stream = entry.nodeStream("nodebuffer") as Readable;
    stream.on("data", (chunk: Uint8Array) => {
      if (failed) return;
      bytes += chunk.byteLength;
      if (bytes > limit) { failed = true; stream.pause(); stream.destroy(); chunks.length = 0; reject(new Error("SCORM extracted content exceeds the permitted size.")); return; }
      chunks.push(chunk);
    }).on("error", reject).on("end", () => {
      if (failed) return;
      const result = new Uint8Array(bytes); let offset = 0;
      for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
      resolve(result);
    }).resume();
  });
}

export function assertPackagePath(path: string) {
  const normalized = path.replace(/\\/g, "/");
  if (!normalized || normalized.length > 1024 || normalized.startsWith("/") || /^[a-z]:/i.test(normalized) || normalized.includes("\u0000") || normalized.split("/").includes("..")) throw new Error("The ZIP package contains an unsafe file path.");
}
