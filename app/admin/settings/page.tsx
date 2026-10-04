import Link from "next/link";
import { pageAuth } from "@/lib/lms/auth";
import { Workspace, Card, secondaryClass } from "@/components/LmsUi";
import AccountSettings from "@/components/AccountSettings";
export default async function SettingsPage() {
  const { profile, user, admin } = await pageAuth();
  const school = profile.school_id ? await admin.from("schools").select("name,code,is_active").eq("id",profile.school_id).maybeSingle() : null;
  return <Workspace title="Settings" description="Manage your account and access the configuration you are permitted to change."><AccountSettings name={profile.full_name || ""} email={user.email || ""} role={profile.role} /><Card className="mt-6"><h2 className="text-lg font-bold text-[#172033]">{profile.role === "super_admin" ? "Platform Administration" : "School"}</h2>{profile.role === "super_admin" ? <div className="mt-4 flex flex-wrap gap-3"><Link className={secondaryClass} href="/admin/schools">School Configuration</Link><Link className={secondaryClass} href="/admin/users">Accounts & Permissions</Link><Link className={secondaryClass} href="/admin/games">Global Content Library</Link></div> : <><p className="mt-3 text-sm text-[#667085]">{school?.error ? "Unable to load school information." : `${school?.data?.name || "School unavailable"}${school?.data?.code ? ` (${school.data.code})` : ""}`}</p><p className="mt-2 text-sm text-[#667085]">School identity and activation are managed by Super Admin. Scheduling and attempt settings are configured per assignment.</p><Link className={`${secondaryClass} mt-4`} href="/admin/assignments">Assignment Configuration</Link></>}</Card></Workspace>;
}
