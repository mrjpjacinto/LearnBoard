import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddSchoolForm from "@/components/AddSchoolForm";
import SchoolsTable from "@/components/SchoolsTable";

export default async function SchoolsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  /*
   * Schools are platform-level resources.
   * Only an active Super Admin may access this page.
   */
  if (
    !profile ||
    !profile.is_active ||
    profile.role !== "super_admin"
  ) {
    redirect("/admin");
  }

  const { data: schools, error } = await supabase
    .from("schools")
    .select(
      "id, name, code, is_active, created_at"
    )
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">

        <div className="flex items-start justify-between gap-6">

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Platform Management
            </p>

            <h1 className="mt-2 text-4xl font-bold text-slate-900">
              Schools
            </h1>

            <p className="mt-3 max-w-2xl text-slate-600">
              Manage the schools that use LearnBoard.
              Each school has its own administrators,
              students and classes.
            </p>
          </div>

          <AddSchoolForm />

        </div>

        {error ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            Unable to load schools.
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-3xl bg-white shadow-sm">

            <div className="border-b border-slate-200 px-7 py-5">
              <h2 className="text-lg font-bold text-slate-900">
                All Schools
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {schools?.length ?? 0}{" "}
                {(schools?.length ?? 0) === 1
                  ? "school"
                  : "schools"}
              </p>
            </div>

            <SchoolsTable schools={schools ?? []} />

          </div>
        )}

      </div>
    </main>
  );
}