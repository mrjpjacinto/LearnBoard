import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AddUserForm from "@/components/AddUserForm";
import UsersTable from "@/components/UsersTable";

type School = {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
};

type ClassRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  school_id: string | null;
};

type Membership = {
  group_id: string;
  user_id: string;
};

export default async function UsersPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: currentProfile } =
    await supabase
      .from("profiles")
      .select(
        "role, is_active, school_id"
      )
      .eq("id", user.id)
      .single();

  const isSuperAdmin =
    currentProfile?.role ===
    "super_admin";

  const isSchoolAdmin =
    currentProfile?.role ===
    "admin";

  if (
    !currentProfile ||
    !currentProfile.is_active ||
    (!isSuperAdmin &&
      !isSchoolAdmin)
  ) {
    redirect("/");
  }

  const admin =
    createAdminClient();

  let users: {
    id: string;
    full_name: string | null;
    email: string;
    role: string;
    is_active: boolean;
    school_id: string | null;
    created_at: string;
  }[] = [];

  let schools: School[] = [];
  let classes: ClassRow[] = [];
  let memberships: Membership[] =
    [];

  let loadError = "";

  if (isSuperAdmin) {
    const [
      usersResult,
      schoolsResult,
      classesResult,
    ] = await Promise.all([
      admin
        .from("profiles")
        .select(
          "id, full_name, email, role, is_active, school_id, created_at"
        )
        .order("created_at", {
          ascending: false,
        }),

      admin
        .from("schools")
        .select(
          "id, name, code, is_active"
        )
        .order("name", {
          ascending: true,
        }),

      admin
        .from("groups")
        .select(
          "id, name, description, is_active, school_id"
        )
        .order("name", {
          ascending: true,
        }),
    ]);

    users =
      usersResult.data ?? [];

    schools =
      schoolsResult.data ?? [];

    classes =
      classesResult.data ?? [];

    if (usersResult.error) {
      loadError =
        usersResult.error.message;
    } else if (
      schoolsResult.error
    ) {
      loadError =
        schoolsResult.error.message;
    } else if (
      classesResult.error
    ) {
      loadError =
        classesResult.error.message;
    }
  } else {
    if (!currentProfile.school_id) {
      loadError =
        "Your administrator account is not assigned to a school.";
    } else {
      const schoolId =
        currentProfile.school_id;

      const [
        usersResult,
        schoolsResult,
        classesResult,
      ] = await Promise.all([
        admin
          .from("profiles")
          .select(
            "id, full_name, email, role, is_active, school_id, created_at"
          )
          .eq(
            "school_id",
            schoolId
          )
          .order("created_at", {
            ascending: false,
          }),

        admin
          .from("schools")
          .select(
            "id, name, code, is_active"
          )
          .eq("id", schoolId),

        admin
          .from("groups")
          .select(
            "id, name, description, is_active, school_id"
          )
          .eq(
            "school_id",
            schoolId
          )
          .order("name", {
            ascending: true,
          }),
      ]);

      users =
        usersResult.data ?? [];

      schools =
        schoolsResult.data ?? [];

      classes =
        classesResult.data ?? [];

      if (usersResult.error) {
        loadError =
          usersResult.error.message;
      } else if (
        schoolsResult.error
      ) {
        loadError =
          schoolsResult.error.message;
      } else if (
        classesResult.error
      ) {
        loadError =
          classesResult.error.message;
      }
    }
  }

  /*
   * Load memberships only from
   * classes this administrator is
   * allowed to manage.
   */
  const classIds =
    classes.map(
      (item) => item.id
    );

  if (classIds.length > 0) {
    const {
      data,
      error,
    } = await admin
      .from("group_members")
      .select(
        "group_id, user_id"
      )
      .in(
        "group_id",
        classIds
      );

    memberships =
      data ?? [];

    if (
      error &&
      !loadError
    ) {
      loadError =
        error.message;
    }
  }

  const totalUsers =
    users.length;

  const totalStudents =
    users.filter(
      (item) =>
        item.role ===
        "student"
    ).length;

  const totalAdmins =
    users.filter(
      (item) =>
        item.role ===
          "admin" ||
        item.role ===
          "super_admin"
    ).length;

  return (
    <main className="p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">

        {/* Page header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h1 className="text-3xl font-bold tracking-tight text-[#172033]">
              Users
            </h1>

            <p className="mt-2 text-slate-500">
              {isSuperAdmin
                ? "Manage administrators and students across LumenTrail schools."
                : "Manage administrators and students in your school."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            <Link
              href="/admin/classes"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8DEEA] bg-white px-5 py-3 text-sm font-semibold text-[#475467] shadow-sm transition hover:border-[#A5B4FC] hover:bg-[#F5F6FF] hover:text-[#4F46E5]"
            >
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
                <path d="M3 21h18" />
                <path d="M5 21V9l7-4 7 4v12" />
                <path d="M9 21v-6h6v6" />
              </svg>

              Manage Classes
            </Link>

            <AddUserForm
              isSuperAdmin={
                isSuperAdmin
              }
              schools={schools}
            />

          </div>
        </div>

        {/* Failed queries are not zero users. */}
        {!loadError && <div className="mt-layout grid gap-layout sm:grid-cols-3">

          <StatCard
            label="Total Users"
            value={totalUsers}
          />

          <StatCard
            label="Students"
            value={
              totalStudents
            }
          />

          <StatCard
            label="Administrators"
            value={
              totalAdmins
            }
          />

        </div>}

        {/* Users */}
        {loadError ? (
          <div className="mt-layout rounded-2xl border border-red-100 bg-white p-6 text-red-600 shadow-sm">
            Unable to load users:{" "}
            {loadError}
            {isSchoolAdmin && !currentProfile.school_id && (
              <p className="mt-3 text-sm">
                Your stored profile role is School Admin (admin). Platform owners require
                a reviewed profile correction to Super Admin; a missing school does not
                grant platform access. <a className="underline" href="/api/account/identity">View your authenticated account identity</a>
                {" "}to verify the account before requesting a correction.
              </p>
            )}
          </div>
        ) : (
          <UsersTable
            users={users}
            currentUserId={
              user.id
            }
            schools={schools}
            classes={classes}
            memberships={
              memberships
            }
            isSuperAdmin={
              isSuperAdmin
            }
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
    <div className="rounded-2xl border border-[#E3E8F2] bg-white px-6 py-3 shadow-sm">

      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-3xl font-bold text-[#172033]">
        {value}
      </p>

    </div>
  );
}
