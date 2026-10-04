import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { Profile } from "./types";

export class LmsError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function authorize(roles: string[]) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new LmsError("Please sign in.", 401);
  const { data, error: profileError } = await supabase.from("profiles").select("id,full_name,email,role,school_id,is_active").eq("id", user.id).maybeSingle();
  const profile = data as Profile | null;
  if (profileError || !profile?.is_active || !roles.includes(profile.role)) throw new LmsError("You do not have permission to do this.", 403);
  const admin = createAdminClient();
  if (profile.role !== "super_admin") {
    if (!profile.school_id) throw new LmsError("Your account is not assigned to a school.", 403);
    const { data: school, error: schoolError } = await admin.from("schools").select("is_active").eq("id", profile.school_id).maybeSingle();
    if (schoolError || !school?.is_active) throw new LmsError("Your school is not active.", 403);
  }
  return { supabase, admin, user, profile };
}
export async function pageAuth(roles = ["super_admin", "admin"]) {
  try { return await authorize(roles); } catch (error) {
    if (error instanceof LmsError) redirect("/");
    throw error;
  }
}
export function assertSchool(profile: Profile, schoolId: string | null) {
  if (!schoolId || (profile.role !== "super_admin" && profile.school_id !== schoolId)) throw new LmsError("This record is not available to your school.", 403);
}
export function checkDb(error: { message: string; code?: string } | null) {
  if (!error) return;
  console.error("LMS database operation failed:", error);
  if (error.code === "23505") throw new LmsError("This record already exists.", 409);
  if (error.code === "PGRST202" || error.code === "42703" || error.code === "PGRST204") throw new LmsError("The LMS database update is required before this feature can be used.", 503);
  throw new LmsError("Unable to save or load learning data. Please try again.", 500);
}
export function apiError(error: unknown) {
  if (error instanceof LmsError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("LMS request failed:", error);
  return NextResponse.json({ error: "Unable to complete the request." }, { status: 500 });
}
export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  try { const value = await request.json(); if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(); return value; }
  catch { throw new LmsError("Invalid request."); }
}
export function uuid(value: unknown, label = "Record") {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new LmsError(`${label} is invalid.`);
  return value;
}
export async function ownedPath(id: string) {
  const auth = await authorize(["super_admin", "admin"]);
  const { data: path, error } = await auth.admin.from("learning_boards").select("id,name,description,status,school_id,updated_at").eq("id", uuid(id)).maybeSingle();
  checkDb(error);
  if (!path) throw new LmsError("Learning Path not found.", 404);
  assertSchool(auth.profile, path.school_id);
  return { ...auth, path };
}
