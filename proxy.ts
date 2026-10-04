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
  await supabase.auth.getUser();
  return response;
}
export const config = { matcher: ["/admin/:path*", "/student/:path*", "/api/:path*"] };
