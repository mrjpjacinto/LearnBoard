import { redirect } from "next/navigation";
import { learningSession } from "@/lib/scorm/session";
import { LmsError } from "@/lib/lms/auth";
import { Workspace, Card } from "@/components/LmsUi";
import ScormPlayer from "@/components/ScormPlayer";
export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try { session = await learningSession(id); } catch(e) {
    if (e instanceof LmsError && e.status === 401) redirect("/");
    return <div className="min-h-screen bg-[#F4F7FB]"><Workspace title="Learning session unavailable" description="Return to My Learning to launch an available assignment." back={{ href: "/student", label: "My Learning" }}><Card>{e instanceof LmsError ? e.message : "Unable to load the learning session."}</Card></Workspace></div>;
  }
  return <div className="min-h-screen bg-[#F4F7FB]"><Workspace title={session.game.name} description={`Attempt ${session.attempt.attempt_number}. Progress saves automatically while this page is open.`} back={{ href: "/student", label: "My Learning" }}><ScormPlayer attemptId={id} sessionToken={session.config.session_token!} deadline={session.config.deadline || null} initialData={session.runtime?.raw_data || {}} orientation={session.game.orientation_mode} /></Workspace></div>;
}
