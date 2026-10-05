import { redirect } from "next/navigation";
export default async function AssignPathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/paths/${encodeURIComponent(id)}`);
}
