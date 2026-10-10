import { apiError, LmsError } from "@/lib/lms/auth";
import { previewContent } from "@/lib/scorm/admin-preview";
import { scormBridge } from "@/lib/scorm/bridge";
export async function GET(request: Request, { params }: { params: Promise<{ token: string; path: string[] }> }) {
  try {
    const { token, path } = await params;
    const id = token;
    if (!token || !path.length) throw new LmsError("Invalid content session.",403);
    if (path.some(p => !p || p === "." || p === ".." || /[\\/\u0000]/.test(p))) throw new LmsError("Invalid content path.", 404);
    const session = await previewContent(token);
    if (path.length===1 && path[0]==="_launch") return Response.redirect(new URL(`/api/admin/preview/${token}/${session.package.launch_file!.split("/").map(encodeURIComponent).join("/")}`,request.url),302);
    const key = `${session.package.extraction_path}/${path.join("/")}`;
    const { data, error } = await session.admin.storage.from("scorm-packages").download(key);
    if (error || !data) throw new LmsError("Content file not found.", 404);
    const types: Record<string,string> = { html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8", js: "text/javascript", mjs: "text/javascript", css: "text/css", json: "application/json", xml: "application/xml", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", mp3: "audio/mpeg", mp4: "video/mp4", woff: "font/woff", woff2: "font/woff2", wasm: "application/wasm" };
    const extension = path[path.length - 1].split(".").pop()!.toLowerCase();
    const headers: Record<string,string> = { "Content-Type": types[extension] || data.type || "application/octet-stream", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "sandbox allow-scripts allow-forms allow-pointer-lock; frame-ancestors 'self'; base-uri 'self'; object-src 'none'" };
    if (request.headers.get("origin") === "null") { headers["Access-Control-Allow-Origin"] = "null"; headers["Access-Control-Allow-Credentials"] = "true"; headers["Vary"] = "Origin"; }
    if (extension === "html" || extension === "htm") {
      const version=session.package.scorm_version,prefix=version==="1.2"?"cmi.core":"cmi";
      const initial:Record<string,string>={};initial[prefix+".mode"]="browse";initial[prefix+".credit"]="no-credit";initial[prefix+".entry"]="ab-initio";
      initial[prefix+"."+(version==="1.2"?"student_id":"learner_id")]="preview";
      initial[prefix+"."+(version==="1.2"?"student_name":"learner_name")]="Administrator preview";
      const script='<script>'+scormBridge(initial,new URL(request.url).origin,id).replace('/api/student/content/','/api/admin/preview/').replace(/function tell\(finish\)\{[^}]+\}/,'function tell(finish){error="0";}')+'</script>';
      let html=await data.text();
      html = html.replace(/<script\b([^>]*\bsrc\s*=[^>]*)>/gi, (_match, attrs: string) => `<script${attrs.replace(/\s+crossorigin(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi, "")} crossorigin="use-credentials">`);
      html = html.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi, "");
      html = /<head\b[^>]*>/i.test(html) ? html.replace(/<head\b[^>]*>/i, match => match + script) : script + html;
      return new Response(html, { headers });
    }
    return new Response(data, { headers });
  } catch(e) { return apiError(e); }
}
