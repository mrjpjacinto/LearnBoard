import { pageAuth } from "@/lib/lms/auth";
import { Workspace, Card } from "@/components/LmsUi";
import ReportsManager from "@/components/ReportsManager";
export default async function ReportsPage() {
  const { admin, profile } = await pageAuth();
  let schools = admin.from("schools").select("id,name").order("name"), groups = admin.from("groups").select("id,name,school_id").order("name"), students = admin.from("profiles").select("id,full_name,email,school_id").eq("role","student").order("full_name"), boards = admin.from("learning_boards").select("id,name,school_id").order("name");
  if (profile.role !== "super_admin") { schools=schools.eq("id",profile.school_id!); groups=groups.eq("school_id",profile.school_id!); students=students.eq("school_id",profile.school_id!); boards=boards.eq("school_id",profile.school_id!); }
  const [s,g,st,b,ga] = await Promise.all([schools,groups,students,boards,admin.from("games").select("id,name").order("name")]);
  return <Workspace title="Reports" description="Review student activity and results. Select a material for details.">{[s,g,st,b,ga].some(v=>v.error) ? <Card>Unable to load report filters.</Card> : <ReportsManager isSuperAdmin={profile.role === "super_admin"} schools={s.data || []} groups={g.data || []} students={st.data || []} boards={b.data || []} games={ga.data || []} />}</Workspace>;
}
