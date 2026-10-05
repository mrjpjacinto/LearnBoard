import { pageAuth } from "@/lib/lms/auth";
import { Workspace } from "@/components/LmsUi";
import AccountSettings from "@/components/AccountSettings";
import { personalDetails } from "@/lib/lms/personal-details";
export default async function StudentSettingsPage() {
  const { profile, user } = await pageAuth(["student"]);
  return <div className="min-h-screen bg-[#F4F7FB]"><Workspace title="Account Settings" description="Update your profile, email address, and password." back={{ href: "/student", label: "My Learning" }}><AccountSettings name={profile.full_name || ""} email={user.email || ""} profileEmail={profile.email} role={profile.role} personal={personalDetails(user.user_metadata?.learnboard_profile)} /></Workspace></div>;
}
