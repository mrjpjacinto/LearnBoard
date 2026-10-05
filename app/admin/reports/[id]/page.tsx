import Link from "next/link";
import { pageAuth, LmsError } from "@/lib/lms/auth";
import { reportMaterials } from "@/lib/lms/reports";
import { Workspace, Card } from "@/components/LmsUi";
import ReportMaterials from "@/components/ReportMaterials";
import ActionIcon from "@/components/ActionIcon";
export default async function ReportDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  await pageAuth();
  const { id } = await params;
  let data: Awaited<ReturnType<typeof reportMaterials>> | undefined;
  let message = "";
  try { data = await reportMaterials(id); } catch (error) {
    if (!(error instanceof LmsError)) throw error;
    message = error.message;
  }
  if (!data) return <Workspace title="Learning Material" description="Report details"><Card><p role="alert">{message}</p><Link href="/admin/reports">Back to Reports</Link></Card></Workspace>;
    return <Workspace title="Learning Material" description={"Student: " + data.student}>
      <Link href="/admin/reports" className="mb-5 inline-flex items-center gap-2 rounded-lg py-2 font-semibold text-[#6366F1] hover:text-[#4F46E5]"><ActionIcon name="previous" />Back to Reports</Link>
      <ReportMaterials games={data.games} path={data.path} />
    </Workspace>;
}
