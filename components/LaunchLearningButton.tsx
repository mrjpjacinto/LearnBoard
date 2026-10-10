"use client";
import StudentPlayNotice, { type PlayRestrictions } from "./StudentPlayNotice";
import ActionIcon from "@/components/ActionIcon";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "./LmsUi";
import { submitJson, useToast } from "./LmsToast";
export default function LaunchLearningButton({ assignmentId, classAssignmentId, gameId, disabled, label, restrictions }: { assignmentId: string | null; classAssignmentId: string | null; gameId: string; disabled: boolean; label: string; restrictions: PlayRestrictions }) {
  const [busy, setBusy] = useState(false); const router = useRouter(); const { notification, setToast } = useToast();
  async function launch() { setBusy(true); try { const result = await submitJson("/api/student/launch", "POST", { assignment_id: assignmentId, class_assignment_id: classAssignmentId, game_id: gameId }); router.push(`/student/play/${result.attempt_id}`); } catch(e) { setToast({ type: "error", message: (e as Error).message }); setBusy(false); } }
  return <>{notification}<StudentPlayNotice restrictions={restrictions} busy={busy} onConfirm={launch}>{show => <button className={buttonClass} disabled={disabled || busy} onClick={show}><ActionIcon name="launch" />{busy ? "Launching..." : label}</button>}</StudentPlayNotice></>;
}
