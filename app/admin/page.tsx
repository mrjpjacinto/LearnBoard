import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
      "full_name, role, is_active, school_id"
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

  const admin = createAdminClient();

  let students = 0;
  let administrators = 0;
  let classes = 0;
  let schools = 0;
  let games = 0;

  /*
   * Super Admin sees platform-wide
   * statistics. School Admin sees
   * statistics for their own school.
   */
  if (isSuperAdmin) {
    const [
      studentsResult,
      adminsResult,
      classesResult,
      schoolsResult,
      gamesResult,
    ] = await Promise.all([
      admin
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("role", "student"),

      admin
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("role", "admin"),

      admin
        .from("groups")
        .select("id", {
          count: "exact",
          head: true,
        }),

      admin
        .from("schools")
        .select("id", {
          count: "exact",
          head: true,
        }),

      admin
        .from("games")
        .select("id", {
          count: "exact",
          head: true,
        }),
    ]);

    students =
      studentsResult.count ?? 0;

    administrators =
      adminsResult.count ?? 0;

    classes =
      classesResult.count ?? 0;

    schools =
      schoolsResult.count ?? 0;

    games =
      gamesResult.count ?? 0;
  } else if (profile.school_id) {
    const schoolId =
      profile.school_id;

    const [
      studentsResult,
      adminsResult,
      classesResult,
    ] = await Promise.all([
      admin
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("role", "student")
        .eq("school_id", schoolId),

      admin
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("role", "admin")
        .eq("school_id", schoolId),

      admin
        .from("groups")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("school_id", schoolId),
    ]);

    students =
      studentsResult.count ?? 0;

    administrators =
      adminsResult.count ?? 0;

    classes =
      classesResult.count ?? 0;

    /*
     * Games are currently platform
     * content, so the total is shared.
     */
    const gamesResult =
      await admin
        .from("games")
        .select("id", {
          count: "exact",
          head: true,
        });

    games =
      gamesResult.count ?? 0;
  }

  const firstName =
    profile.full_name
      ?.trim()
      .split(/\s+/)[0] ||
    "Administrator";

  return (
    <main className="p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div>
          <p className="text-sm font-semibold tracking-wide text-[#6366F1]">
            DASHBOARD
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#172033]">
            Welcome back, {firstName}
          </h1>

          <p className="mt-2 text-slate-500">
            {isSuperAdmin
              ? "Here’s an overview of LearnBoard across all schools."
              : "Here’s an overview of your school on LearnBoard."}
          </p>
        </div>

        {/* Main statistics */}
        <div
          className={`mt-8 grid gap-4 ${
            isSuperAdmin
              ? "sm:grid-cols-2 xl:grid-cols-4"
              : "sm:grid-cols-2 xl:grid-cols-3"
          }`}
        >
          {isSuperAdmin && (
            <StatCard
              title="Schools"
              value={schools}
              description="Schools on LearnBoard"
              icon={<SchoolIcon />}
              href="/admin/schools"
            />
          )}

          <StatCard
            title="Students"
            value={students}
            description="Student accounts"
            icon={<UsersIcon />}
            href="/admin/users"
          />

          <StatCard
            title="Administrators"
            value={administrators}
            description="School administrators"
            icon={<AdminIcon />}
            href="/admin/users"
          />

          <StatCard
            title="Classes"
            value={classes}
            description="Learning groups"
            icon={<ClassIcon />}
            href="/admin/classes"
          />
        </div>

        {/* Content */}
        <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">

          {/* Quick Actions */}
          <section className="rounded-2xl border border-[#E3E8F2] bg-white p-6 shadow-sm">

            <div>
              <h2 className="text-lg font-bold text-[#172033]">
                Quick Actions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Jump directly to the areas you manage most often.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">

              {isSuperAdmin && (
                <QuickAction
                  href="/admin/schools"
                  title="Manage Schools"
                  description="Add schools and manage school information."
                  icon={<SchoolIcon />}
                />
              )}

              <QuickAction
                href="/admin/users"
                title="Manage Users"
                description="Add administrators, students, schools and classes."
                icon={<UsersIcon />}
              />

              <QuickAction
                href="/admin/games"
                title="Manage Games"
                description="Upload and manage learning games and SCORM content."
                icon={<GameIcon />}
              />

              <QuickAction
                href="/admin/paths"
                title="Learning Paths"
                description="Organize games into structured learning paths."
                icon={<PathIcon />}
              />

              <QuickAction
                href="/admin/reports"
                title="View Reports"
                description="Review student activity, progress and results."
                icon={<ReportIcon />}
              />

            </div>
          </section>

          {/* Platform summary */}
          <section className="rounded-2xl border border-[#E3E8F2] bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-[#172033]">
              Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current LearnBoard activity.
            </p>

            <div className="mt-6 space-y-3">

              <SummaryRow
                label="Students"
                value={students}
              />

              <SummaryRow
                label="Administrators"
                value={administrators}
              />

              <SummaryRow
                label="Classes"
                value={classes}
              />

              <SummaryRow
                label="Games"
                value={games}
              />

              {isSuperAdmin && (
                <SummaryRow
                  label="Schools"
                  value={schools}
                />
              )}

            </div>

            <Link
              href="/admin/reports"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4F46E5]"
            >
              Open Reports

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>

          </section>

        </div>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  href,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-[#E3E8F2] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#C7D2FE] hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">

        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-[#172033]">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1] transition group-hover:bg-[#6366F1] group-hover:text-white">
          {icon}
        </div>

      </div>
    </Link>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex gap-4 rounded-xl border border-[#E3E8F2] p-4 transition hover:border-[#A5B4FC] hover:bg-[#F8F8FF]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1]">
        {icon}
      </div>

      <div>
        <p className="text-sm font-semibold text-[#172033] transition group-hover:text-[#4F46E5]">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </Link>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[#F8FAFC] px-4 py-3">

      <span className="text-sm font-medium text-slate-600">
        {label}
      </span>

      <span className="text-sm font-bold text-[#172033]">
        {value}
      </span>

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

function UsersIcon() {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function AdminIcon() {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ClassIcon() {
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
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

function GameIcon() {
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
      <path d="M6 12h4" />
      <path d="M8 10v4" />
      <path d="M15 13h.01" />
      <path d="M18 11h.01" />
      <path d="M17.32 5H6.68A4 4 0 0 0 3 7.44L1.5 14A4 4 0 0 0 8 18l2-2h4l2 2a4 4 0 0 0 6.5-4l-1.5-6.56A4 4 0 0 0 17.32 5Z" />
    </svg>
  );
}

function PathIcon() {
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
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M8 18h3a4 4 0 0 0 4-4v-4a4 4 0 0 1 4-4" />
    </svg>
  );
}

function ReportIcon() {
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
      <path d="M3 3v18h18" />
      <path d="m7 16 4-5 4 3 5-7" />
    </svg>
  );
}