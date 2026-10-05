import { NextResponse } from "next/server";
import { authorize, jsonBody, apiError, checkDb, LmsError } from "@/lib/lms/auth";
export async function PATCH(request: Request) {
  try {
    const { supabase, admin, profile, user } = await authorize(["super_admin", "admin", "student"]);
    const body = await jsonBody(request);
    let message = "Account updated.";
    async function reauthenticate() {
      if (!user.email || typeof body.current_password !== "string" || !body.current_password) throw new LmsError("Enter your current password.");
      const reauth = await supabase.auth.signInWithPassword({ email: user.email, password: body.current_password });
      if (reauth.error || reauth.data.user?.id !== profile.id) throw new LmsError("Your current password is incorrect.", 403);
    }
    if (body.action === "password") {
      if (typeof body.new_password !== "string" || body.new_password.length < 8 || body.new_password.length > 128 || body.current_password === body.new_password) throw new LmsError("Enter a different new password of 8–128 characters.");
      await reauthenticate();
      const { error } = await supabase.auth.updateUser({ password: body.new_password });
      if (error) throw new LmsError("Unable to update your password. Please try again.");
      message = "Password updated.";
    } else if (body.action === "email") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || email === user.email?.toLowerCase()) throw new LmsError("Enter a valid, different email address.");
      await reauthenticate();
      const { data, error } = await supabase.auth.updateUser({ email });
      if (error) { console.error("Email change failed:", error.code); throw new LmsError("Unable to request the email change. Please check the address and try again."); }
      // Never put an unconfirmed address into public.profiles.
      if (data.user?.email?.toLowerCase() === email) {
        const saved = await admin.from("profiles").update({ email: data.user.email, updated_at: new Date().toISOString() }).eq("id", profile.id);
        if (saved.error) throw new LmsError("Email changed, but the profile email could not be synced. Reload Settings to retry.", 500);
        message = "Email updated.";
      } else message = "Email change requested. Check your current and new inboxes for confirmation, then reopen Settings.";
    } else if (body.action === "sync_email") {
      if (!user.email) throw new LmsError("No verified account email is available.");
      const saved = await admin.from("profiles").update({ email: user.email, updated_at: new Date().toISOString() }).eq("id",profile.id);
      checkDb(saved.error);
    } else if (body.action === "profile") {
      const name = typeof body.full_name === "string" ? body.full_name.trim() : "";
      if (!name || name.length > 150) throw new LmsError("Enter your name, up to 150 characters.");
      const personal: Record<string,string> = {};
      const avatar = body.avatar ?? "";
      if (typeof avatar !== "string" || avatar.length > 64000 || (avatar && (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(avatar) || !Buffer.from(avatar.split(",")[1], "base64").subarray(0,3).equals(Buffer.from([255,216,255]))))) throw new LmsError("Choose a valid profile image.");
      personal.avatar = avatar;
      for (const [key,max] of [["phone",40],["job_title",100],["bio",1000]] as const) {
        const value = body[key];
        if (typeof value !== "string" || value.length > max) throw new LmsError(`Enter valid ${key.replace("_"," ")} information.`);
        personal[key] = value.trim();
      }
      const metadata = await supabase.auth.updateUser({ data: { learnboard_profile: personal } });
      if (metadata.error) throw new LmsError("Unable to save personal information. Please try again.");
      const saved = await admin.from("profiles").update({ full_name: name, email: user.email, updated_at: new Date().toISOString() }).eq("id", profile.id);
      if (saved.error) { console.error("Profile save failed:",saved.error); throw new LmsError("Personal details saved, but your name could not be saved. Please retry.",500); }
      message = "Profile updated.";
    } else throw new LmsError("Choose a valid account setting.");
    return NextResponse.json({ success: true, message });
  } catch (e) { return apiError(e); }
}
