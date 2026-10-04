import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
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

  /*
   * Once the multi-school migration is complete,
   * ordinary School Admins must belong to a school.
   *
   * Super Admin deliberately has school_id = null.
   */

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">

        <div className="rounded-3xl bg-slate-900 p-10 text-white">

          <p className="text-sm font-medium text-slate-300">
            {isSuperAdmin
              ? "Super Administrator Portal"
              : "School Administrator Portal"}
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Welcome to LearnBoard
          </h1>

          <p className="mt-3 text-slate-300">
            Signed in as{" "}
            {profile.full_name || profile.email}
          </p>

          {isSuperAdmin && (
            <p className="mt-2 text-sm text-slate-400">
              Platform-wide administration
            </p>
          )}

        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">

          {isSuperAdmin && (
            <DashboardCard
              title="Schools"
              value="0"
            />
          )}

          <DashboardCard
            title="Students"
            value="0"
          />

          <DashboardCard
            title="Games"
            value="0"
          />

          <DashboardCard
            title="Learning Paths"
            value="0"
          />

        </div>

        <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">

          <h2 className="text-2xl font-bold text-slate-900">
            {isSuperAdmin
              ? "Platform Dashboard"
              : "School Dashboard"}
          </h2>

          <p className="mt-3 text-slate-600">
            {isSuperAdmin
              ? "Manage schools, administrators, students, games, learning paths and reports across LearnBoard."
              : "Manage your school's students, games, learning paths and reports."}
          </p>

        </div>

      </div>
    </main>
  );
}

function DashboardCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-7 shadow-sm">

      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-3 text-4xl font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}