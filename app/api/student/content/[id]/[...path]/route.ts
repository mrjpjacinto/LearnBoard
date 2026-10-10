import { sentenceResume } from "@/lib/scorm/sentence-resume";
import { apiError, LmsError } from "@/lib/lms/auth";
import { learningSession } from "@/lib/scorm/session";
import { assertPlayerCanOpen, claimPlayerLaunch } from "@/lib/scorm/player-launch";
import { scormBridge } from "@/lib/scorm/bridge";
export async function GET(request: Request, { params }: { params: Promise<{ id: string; path: string[] }> }) {
  try {
    const { id, path: requestedPath } = await params;
    const [token,...path] = requestedPath;
    if (!token || !path.length) throw new LmsError("Invalid content session.",403);
    if (path.some(p => !p || p === "." || p === ".." || /[\\/\u0000]/.test(p))) throw new LmsError("Invalid content path.", 404);
    const session = await learningSession(id,token);
    if (path.length===1 && path[0]==="_launch") {
      assertPlayerCanOpen(session);
      return Response.redirect(new URL(`/api/student/content/${id}/${token}/${session.package.launch_file!.split("/").map(encodeURIComponent).join("/")}`,request.url),302);
    }
    const key = `${session.package.extraction_path}/${path.join("/")}`;
    const { data, error } = await session.admin.storage.from("scorm-packages").download(key);
    if (error || !data) throw new LmsError("Content file not found.", 404);
    if (path.join("/") === session.package.launch_file) await claimPlayerLaunch(session);
    const types: Record<string,string> = { html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8", js: "text/javascript", mjs: "text/javascript", css: "text/css", json: "application/json", xml: "application/xml", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", mp3: "audio/mpeg", mp4: "video/mp4", woff: "font/woff", woff2: "font/woff2", wasm: "application/wasm" };
    const extension = path[path.length - 1].split(".").pop()!.toLowerCase();
    const headers: Record<string,string> = { "Content-Type": types[extension] || data.type || "application/octet-stream", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "sandbox allow-scripts allow-forms allow-pointer-lock; frame-ancestors 'self'; base-uri 'self'; object-src 'none'" };
    if (request.headers.get("origin") === "null") { headers["Access-Control-Allow-Origin"] = "null"; headers["Access-Control-Allow-Credentials"] = "true"; headers["Vary"] = "Origin"; }
    if (extension === "html" || extension === "htm") {
      const initial: Record<string,string> = { ...(session.runtime?.raw_data || {}) };
      const version = session.config.scorm_version!;
      const prefix = version === "1.2" ? "cmi.core" : "cmi";
      initial[`${prefix}.${version === "1.2" ? "student_id" : "learner_id"}`] = session.profile.id;
      initial[`${prefix}.${version === "1.2" ? "student_name" : "learner_name"}`] = session.profile.full_name || "Student";
      initial[`${prefix}.entry`] = Object.keys(session.runtime?.raw_data || {}).length ? "resume" : "ab-initio";
      initial[`${prefix}.mode`] = "normal"; initial[`${prefix}.credit`] = "credit";
      initial[`${prefix}.session_time`] = version === "1.2" ? "0000:00:00.00" : "PT0S";
      initial[version === "1.2" ? "cmi.student_data.mastery_score" : "cmi.scaled_passing_score"] = String(version === "1.2" ? session.config.passing_score ?? 70 : (session.config.passing_score ?? 70)/100);
      const total = session.runtime?.total_time_seconds || 0;
      initial[`${prefix}.total_time`] = version === "1.2" ? `${String(Math.floor(total/3600)).padStart(4,"0")}:${String(Math.floor(total%3600/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}.00` : `PT${total}S`;
      if (version === "1.2") initial["cmi.core.lesson_status"] ||= "incomplete";
      else { initial["cmi.completion_status"] ||= "incomplete"; initial["cmi.success_status"] ||= "unknown"; }
      const script = `<script>${scormBridge(initial, new URL(request.url).origin, id)}</script>`;
      let html = sentenceResume(await data.text(), initial);
      html = html.replace(/<script\b([^>]*\bsrc\s*=[^>]*)>/gi, (_match, attrs: string) => `<script${attrs.replace(/\s+crossorigin(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi, "")} crossorigin="use-credentials">`);
      html = html.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi, "");
      html = /<head\b[^>]*>/i.test(html) ? html.replace(/<head\b[^>]*>/i, match => match + script) : script + html;
      return new Response(html, { headers });
    }
    return new Response(data, { headers });
  } catch(e) { return apiError(e); }
}
