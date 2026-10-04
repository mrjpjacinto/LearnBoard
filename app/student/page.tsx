import { redirect } from "next/navigation";
import { studentLearning } from "@/lib/lms/student-data";
import { LmsError } from "@/lib/lms/auth";
import { Workspace, Card } from "@/components/LmsUi";
import StudentDashboard from "@/components/StudentDashboard";
export default async function StudentPage() {
  let data;
  try { data = await studentLearning(); } catch (e) {
    if (e instanceof LmsError && (e.status === 401 || e.status === 403)) redirect("/");
    return <div className="min-h-screen bg-[#F4F7FB]"><Workspace title="My Learning" description="Your assigned Learning Paths and games."><Card>Unable to load assigned learning. Please try again. The LMS database update may be required.</Card></Workspace></div>;
  }
  return <StudentDashboard name={data.profile.full_name || "student"} learning={data.learning} />;
}
