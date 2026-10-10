import { personalDetails } from "@/lib/lms/personal-details";
import { pageAuth } from "@/lib/lms/auth";

import AdminSidebar from "@/components/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, user } = await pageAuth();

  return (
    <div className="admin-portal min-h-screen bg-[#F4F7FB] text-[#172033]">
      <div className="flex min-h-screen">

        <AdminSidebar
          avatar={personalDetails(user.user_metadata?.learnboard_profile).avatar}
          role={profile.role}
          fullName={profile.full_name}
          email={
            profile.email ||
            user.email ||
            ""
          }
        />

        <main className="ml-[64px] min-w-0 flex-1 bg-[#F4F7FB] lg:ml-[260px]">
          {children}
        </main>

      </div>
    </div>
  );
}