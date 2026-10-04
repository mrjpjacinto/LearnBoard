import { pageAuth } from "@/lib/lms/auth";
import { Workspace } from "@/components/LmsUi";
import AccountSettings from "@/components/AccountSettings";
export default async function StudentSettingsPage() {
  const { profile, user } = await pageAuth(["student"]);
  return <div className="min-h-screen bg-[#F4F7FB]"><Workspace title="Account Settings" description="Update your name and password." back={{ href: "/student", label: "My Learning" }}><AccountSettings name={profile.full_name || ""} email={user.email || ""} role={profile.role} /></Workspace></div>;
}
