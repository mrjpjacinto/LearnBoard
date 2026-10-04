import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/AdminSidebar";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">

        <AdminSidebar role={profile.role} />

        <div className="min-w-0 flex-1">
          {children}
        </div>

      </div>
    </div>
  );
}