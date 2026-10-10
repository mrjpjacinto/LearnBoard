import { apiError } from "@/lib/lms/auth";
import { learningSession } from "@/lib/scorm/session";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; const session = await learningSession(id); return Response.redirect(new URL(`/api/student/content/${id}/${session.config.session_token}/_launch`, request.url), 302); }
  catch(e) { return apiError(e); }
}
