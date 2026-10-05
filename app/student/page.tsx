import { redirect } from "next/navigation";
import { studentLearning } from "@/lib/lms/student-data";
import { LmsError } from "@/lib/lms/auth";
import { Workspace, Card } from "@/components/LmsUi";
import StudentDashboard from "@/components/StudentDashboard";
export default async function StudentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  let data;
  try { data = await studentLearning(); } catch (e) {
    if (e instanceof LmsError && (e.status === 401 || e.status === 403)) redirect("/");
    return <Workspace title="My Learning" description="Your assigned Learning Paths and games."><Card>Unable to load your learning. Refresh the page to try again, or contact your teacher if the problem continues.</Card></Workspace>;
  }
  const { tab } = await searchParams;
  return <StudentDashboard name={data.profile.full_name || "Student"} learning={data.learning} tab={tab} />;
}
