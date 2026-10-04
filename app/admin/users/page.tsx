import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddUserForm from "@/components/AddUserForm";
import UsersTable from "@/components/UsersTable";

export default async function UsersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (
    !currentProfile ||
    !currentProfile.is_active ||
    currentProfile.role !== "admin"
  ) {
    redirect("/");
  }

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, created_at")
    .order("created_at", { ascending: false });

  const totalUsers = users?.length ?? 0;

  const totalStudents =
    users?.filter((item) => item.role === "student").length ?? 0;

  const totalAdmins =
    users?.filter((item) => item.role === "admin").length ?? 0;

  return (
    <main className="p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">

        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              USER MANAGEMENT
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Users
            </h1>

            <p className="mt-2 text-slate-500">
              Manage LearnBoard administrators and students.
            </p>
          </div>

          <AddUserForm />
        </div>

        {/* Statistics */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Users"
            value={totalUsers}
          />

          <StatCard
            label="Students"
            value={totalStudents}
          />

          <StatCard
            label="Administrators"
            value={totalAdmins}
          />
        </div>

        {/* Users table */}
        {error ? (
          <div className="mt-8 rounded-2xl bg-white p-6 text-red-600 shadow-sm">
            Unable to load users: {error.message}
          </div>
        ) : (
          <UsersTable
 		users={users ?? []}
  		currentUserId={user.id}
	/>
        )}

      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}