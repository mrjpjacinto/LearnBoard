import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AddClassForm from "@/components/AddClassForm";
import ClassesTable from "@/components/ClassesTable";

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
  created_at: string;
};

type Student = {
  id: string;
  full_name: string | null;
  email: string;
  school_id: string | null;
  is_active: boolean;
};

type Membership = {
  group_id: string;
  user_id: string;
};

export default async function ClassesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, school_id")
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

  if (
    isSchoolAdmin &&
    !profile.school_id
  ) {
    redirect("/admin/users");
  }

  const admin =
    createAdminClient();

  let schools: School[] = [];
  let classes: ClassRow[] = [];
  let students: Student[] = [];
  let memberships: Membership[] = [];

  if (isSuperAdmin) {
    const [
      schoolsResult,
      classesResult,
      studentsResult,
    ] = await Promise.all([
      admin
        .from("schools")
        .select(
          "id, name, code, is_active"
        )
        .order("name"),
      admin
        .from("groups")
        .select(
          "id, name, description, is_active, school_id, created_at"
        )
        .order("name"),
      admin
        .from("profiles")
        .select(
          "id, full_name, email, school_id, is_active"
        )
        .eq("role", "student")
        .order("full_name"),
    ]);

    schools =
      schoolsResult.data ?? [];

    classes =
      classesResult.data ?? [];

    students =
      studentsResult.data ?? [];
  } else {
    const schoolId =
      profile.school_id!;

    const [
      schoolsResult,
      classesResult,
      studentsResult,
    ] = await Promise.all([
      admin
        .from("schools")
        .select(
          "id, name, code, is_active"
        )
        .eq("id", schoolId),
      admin
        .from("groups")
        .select(
          "id, name, description, is_active, school_id, created_at"
        )
        .eq("school_id", schoolId)
        .order("name"),
      admin
        .from("profiles")
        .select(
          "id, full_name, email, school_id, is_active"
        )
        .eq("role", "student")
        .eq("school_id", schoolId)
        .order("full_name"),
    ]);

    schools =
      schoolsResult.data ?? [];

    classes =
      classesResult.data ?? [];

    students =
      studentsResult.data ?? [];
  }

  const classIds =
    classes.map(
      (item) => item.id
    );

  if (classIds.length > 0) {
    const { data } = await admin
      .from("group_members")
      .select("group_id, user_id")
      .in("group_id", classIds);

    memberships = data ?? [];
  }

  const activeClasses =
    classes.filter(
      (item) => item.is_active
    ).length;

  const memberCount =
    new Set(
      memberships.map(
        (item) => item.user_id
      )
    ).size;

  return (
    <main className="p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">

        <div className="mb-layout flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#6366F1]">
              <Link
                href="/admin/users"
                className="hover:text-[#4F46E5]"
              >
                Users
              </Link>

              <span className="text-slate-300">
                /
              </span>

              <span>Classes</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-[#172033]">
              Classes
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Organize students into classes and manage class membership.
            </p>
          </div>

          <AddClassForm
            isSuperAdmin={
              isSuperAdmin
            }
            schools={schools}
          />

        </div>

        <div className="mb-layout grid gap-layout sm:grid-cols-3">

          <div className="rounded-2xl border border-[#E3E8F2] bg-white px-5 py-3 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Classes
            </p>

            <p className="mt-1 text-3xl font-bold text-[#172033]">
              {classes.length}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E3E8F2] bg-white px-5 py-3 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Active Classes
            </p>

            <p className="mt-1 text-3xl font-bold text-[#172033]">
              {activeClasses}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E3E8F2] bg-white px-5 py-3 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Students in Classes
            </p>

            <p className="mt-1 text-3xl font-bold text-[#172033]">
              {memberCount}
            </p>
          </div>

        </div>

        <ClassesTable
          classes={classes}
          students={students}
          memberships={
            memberships
          }
          schools={schools}
        />

      </div>
    </main>
  );
}