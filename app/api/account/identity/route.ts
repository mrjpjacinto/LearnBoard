import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Allows an administrator with an incorrect school assignment to inspect their
// own authenticated identity without granting any additional permissions.
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("id,full_name,role,school_id,is_active").eq("id", user.id).single();
  if (profileError) {
    console.error("Unable to inspect authenticated LumenTrail profile:", profileError);
    return NextResponse.json({ error: "Unable to load your authenticated profile." }, { status: 500 });
  }
  return NextResponse.json({ auth_user_id: user.id, email: user.email, profile },
    { headers: { "Cache-Control": "private, no-store" } });
}
