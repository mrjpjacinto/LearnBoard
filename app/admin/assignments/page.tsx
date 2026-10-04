import { assignmentAdminData } from "@/lib/lms/admin-data";
import { Workspace, Card } from "@/components/LmsUi";
import AssignmentsManager from "@/components/AssignmentsManager";
export default async function AssignmentsPage() {
  const data = await assignmentAdminData();
  return <Workspace title="Assignments & Scheduling" description="Assign Learning Paths to classes or students, and schedule individual games.">{data.loadError ? <Card>Unable to load assignments. Check that the LMS database update has been applied.</Card> : <AssignmentsManager boards={data.boards} groups={data.groups} students={data.students} assignments={data.assignments} classAssignments={data.classAssignments} games={data.games} />}</Workspace>;
}
