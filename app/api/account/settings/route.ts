import { NextResponse } from "next/server";
import { authorize, jsonBody, apiError, checkDb, LmsError } from "@/lib/lms/auth";
export async function PATCH(request: Request) {
  try {
    const { supabase, admin, profile, user } = await authorize(["super_admin", "admin", "student"]);
    const body = await jsonBody(request);
    if (body.action === "password") {
      if (typeof body.current_password !== "string" || typeof body.new_password !== "string" || body.new_password.length < 8 || body.new_password.length > 128 || body.current_password === body.new_password) throw new LmsError("Enter your current password and a different new password of 8–128 characters.");
      if (!user.email) throw new LmsError("This account does not support password changes.");
      const reauth = await supabase.auth.signInWithPassword({ email: user.email, password: body.current_password });
      if (reauth.error || reauth.data.user?.id !== profile.id) throw new LmsError("Your current password is incorrect.", 403);
      const { error } = await supabase.auth.updateUser({ password: body.new_password });
      if (error) throw new LmsError("Unable to update your password. Please try again.");
    } else if (body.action === "profile") {
      const name = typeof body.full_name === "string" ? body.full_name.trim() : "";
      if (!name || name.length > 150) throw new LmsError("Enter your name, up to 150 characters.");
      const { error } = await admin.from("profiles").update({ full_name: name, updated_at: new Date().toISOString() }).eq("id", profile.id);
      checkDb(error);
    } else throw new LmsError("Choose a valid account setting.");
    return NextResponse.json({ success: true });
  } catch(e) { return apiError(e); }
}
