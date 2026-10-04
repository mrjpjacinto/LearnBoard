import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddSchoolForm from "@/components/AddSchoolForm";
import SchoolsTable from "@/components/SchoolsTable";

export default async function SchoolsPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } =
    await supabase
      .from("profiles")
      .select(
        "role, is_active"
      )
      .eq("id", user.id)
      .single();

  if (
    !profile ||
    !profile.is_active ||
    profile.role !==
      "super_admin"
  ) {
    redirect("/admin");
  }

  const {
    data: schools,
    error,
  } = await supabase
    .from("schools")
    .select(
      "id, name, code, is_active, created_at"
    )
    .order("name", {
      ascending: true,
    });

  const schoolList =
    schools ?? [];

  const totalSchools =
    schoolList.length;

  const activeSchools =
    schoolList.filter(
      (school) =>
        school.is_active
    ).length;

  const inactiveSchools =
    totalSchools -
    activeSchools;

  return (
    <main className="p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-sm font-semibold tracking-wide text-[#6366F1]">
              SCHOOL MANAGEMENT
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#172033]">
              Schools
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Manage the schools using
              LearnBoard and control
              whether each school is
              active.
            </p>
          </div>

          <AddSchoolForm />

        </div>

        {/* Statistics */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">

          <StatCard
            label="Total Schools"
            value={totalSchools}
            icon={<SchoolIcon />}
          />

          <StatCard
            label="Active Schools"
            value={activeSchools}
            icon={<ActiveIcon />}
          />

          <StatCard
            label="Inactive Schools"
            value={inactiveSchools}
            icon={<InactiveIcon />}
          />

        </div>

        {/* Error */}
        {error ? (
          <div className="mt-8 rounded-2xl border border-red-100 bg-white p-6 shadow-sm">

            <p className="font-semibold text-red-700">
              Unable to load schools
            </p>

            <p className="mt-1 text-sm text-red-600">
              {error.message}
            </p>

          </div>
        ) : (

          <div className="mt-8">

            <SchoolsTable
              schools={
                schoolList
              }
            />

          </div>

        )}

      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E3E8F2] bg-white p-6 shadow-sm">

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-[#172033]">
            {value}
          </p>

        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1]">
          {icon}
        </div>

      </div>

    </div>
  );
}

function SchoolIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M3 21h18" />
      <path d="M5 21V9l7-4 7 4v12" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 11h.01" />
      <path d="M15 11h.01" />
    </svg>
  );
}

function ActiveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function InactiveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="M8 12h8" />
    </svg>
  );
}