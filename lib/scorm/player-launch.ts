import "server-only";
import { checkDb, LmsError } from "@/lib/lms/auth";
import type { createAdminClient } from "@/lib/supabase/admin";

type PlayerSession = {
  admin: ReturnType<typeof createAdminClient>;
  attempt: { id: string };
  schedule: { allow_resume: boolean };
  config: { session_token?: string; allow_resume?: boolean; player_opened_token?: string };
};

export function resumeAllowed(session: Pick<PlayerSession, "schedule" | "config">) {
  return session.schedule.allow_resume && session.config.allow_resume === true;
}

export function assertPlayerCanOpen(session: Pick<PlayerSession, "schedule" | "config">) {
  if (!resumeAllowed(session) && session.config.player_opened_token === session.config.session_token) {
    throw new LmsError("Resume is disabled for this attempt. Return to My Learning.", 403);
  }
}

// Compare and swap makes simultaneous first opens compete for one launch.
// Asset requests and runtime saves do not claim the launch again.
export async function claimPlayerLaunch(session: PlayerSession) {
  assertPlayerCanOpen(session);
  if (session.config.player_opened_token === session.config.session_token) return;
  let query = session.admin.from("attempts").update({
    launch_config: { ...session.config, player_opened_token: session.config.session_token },
  }).eq("id", session.attempt.id).eq("status", "in_progress")
    .eq("launch_config->>session_token", session.config.session_token!)
    .eq("launch_config", JSON.stringify(session.config));
  query = session.config.player_opened_token
    ? query.eq("launch_config->>player_opened_token", session.config.player_opened_token)
    : query.is("launch_config->>player_opened_token", null);
  const result = await query.select("id").maybeSingle();
  checkDb(result.error);
  if (!result.data) throw new LmsError("This game was opened in another window. Return to My Learning.", 409);
}
