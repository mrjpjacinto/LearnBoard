import { notFound } from "next/navigation";
import { assignmentAdminData } from "@/lib/lms/admin-data";
import { Workspace, Card } from "@/components/LmsUi";
import AssignmentsManager from "@/components/AssignmentsManager";
export default async function AssignPathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await assignmentAdminData(id);
  const board = data.boards[0];
  if (!board && !data.loadError) notFound();
  return <Workspace title="Manage Assignments" description={`Assign ${board?.name || "this Learning Path"} and set availability and attempt rules.`} back={{ href: `/admin/paths/${id}`, label: board?.name || "Learning Path" }}>{data.loadError ? <Card>Unable to load assignments. Check that the LMS database update has been applied.</Card> : <AssignmentsManager boards={data.boards} groups={data.groups} students={data.students} assignments={data.assignments} classAssignments={data.classAssignments} games={[]} fixedBoard={id} />}</Workspace>;
}
