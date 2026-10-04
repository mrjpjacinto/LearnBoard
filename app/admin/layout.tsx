import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, email, role, is_active, school_id"
    )
    .eq("id", user.id)
    .single();

  const isSuperAdmin =
    profile?.role === "super_admin";

  const isSchoolAdmin =
    profile?.role === "admin";

  if (
    !profile ||
    !profile.is_active ||
    (!isSuperAdmin && !isSchoolAdmin)
  ) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <div className="flex min-h-screen">

        <AdminSidebar
          role={profile.role}
          fullName={profile.full_name}
          email={
            profile.email ||
            user.email ||
            ""
          }
        />

        <main className="min-w-0 flex-1 bg-[#F4F7FB]">
          {children}
        </main>

      </div>
    </div>
  );
}