import { mutationAccountAllowed, MutationLimiter } from "@/lib/security/mutation-policy";
import { createAdminClient } from "@/lib/supabase/admin";
const limiter = new MutationLimiter();
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const site = request.headers.get("sec-fetch-site");
    if ((origin && origin !== request.nextUrl.origin) || site === "cross-site") return NextResponse.json({ error: "Request origin is not permitted." }, { status: 403 });
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => request.cookies.getAll(), setAll(values) {
      values.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    } },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (request.nextUrl.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const deny = (message: string, status: number, retry?: number) => {
      const result = NextResponse.json({ error: message }, { status });
      for (const cookie of response.cookies.getAll()) result.cookies.set(cookie);
      if (retry) result.headers.set("Retry-After", String(retry));
      return result;
    };
    if (error || !user) return deny("Please sign in.", 401);
    const admin = createAdminClient();
    const profile = await admin.from("profiles").select("role,school_id,is_active").eq("id", user.id).maybeSingle();
    if (profile.error) return deny("Unable to verify account access.", 503);
    const school = profile.data?.school_id && profile.data.role !== "super_admin"
      ? await admin.from("schools").select("is_active").eq("id", profile.data.school_id).maybeSingle() : null;
    if (school?.error) return deny("Unable to verify school access.", 503);
    if (!mutationAccountAllowed(profile.data, school?.data?.is_active === true)) return deny("Your account or school is not active.", 403);
    const path = request.nextUrl.pathname;
    const category = path.startsWith("/api/account/") ? "account" : path.includes("/runtime/") ? "runtime" : path.includes("/launch") ? "launch" : "admin";
    const retry = limiter.take(user.id + ":" + category, { account: 10, runtime: 120, launch: 30, admin: 60 }[category]);
    if (retry) return deny("Too many requests. Please wait and try again.", 429, retry);
  }
  return response;
}
export const config = { matcher: ["/admin/:path*", "/student/:path*", "/api/:path*"] };
