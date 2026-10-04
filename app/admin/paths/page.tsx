import Link from "next/link";
import { pageAuth } from "@/lib/lms/auth";
import PathsLibrary from "@/components/PathsLibrary";
import { Workspace, buttonClass, Card } from "@/components/LmsUi";
export default async function PathsPage() {
  const { admin, profile } = await pageAuth();
  let query = admin.from("learning_boards").select("id,name,description,status,school_id,updated_at").order("updated_at", { ascending: false });
  if (profile.role !== "super_admin") query = query.eq("school_id", profile.school_id!);
  const [paths, schools] = await Promise.all([query, profile.role === "super_admin" ? admin.from("schools").select("id,name").order("name") : admin.from("schools").select("id,name").eq("id", profile.school_id!)]);
  return <Workspace title="Learning Paths" description="Create school-owned learning sequences from the global games library." actions={<Link href="/admin/paths/add" className={buttonClass}>+ Add Learning Path</Link>}>{paths.error || schools.error ? <Card>Unable to load Learning Paths. Please try again.</Card> : <PathsLibrary paths={paths.data || []} schools={schools.data || []} isSuperAdmin={profile.role === "super_admin"} />}</Workspace>;
}
