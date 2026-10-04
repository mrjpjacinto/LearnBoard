import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddLearningPathForm from "@/components/AddLearningPathForm";

type SchoolRow = {
  id: string;
  name: string;
};

export default async function AddLearningPathPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role, is_active, school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    !["super_admin", "admin"].includes(profile.role)
  ) {
    redirect("/");
  }

  const isSuperAdmin =
    profile.role === "super_admin";

  if (
    !isSuperAdmin &&
    !profile.school_id
  ) {
    redirect("/admin/paths");
  }

  let schools: SchoolRow[] = [];

  if (isSuperAdmin) {
    const {
      data,
      error,
    } = await supabase
      .from("schools")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error(
        "Unable to load schools:",
        error
      );
    } else {
      schools =
        (data || []) as SchoolRow[];
    }
  }

  return (
    <main className="min-h-full bg-[#F4F7FB]">
      <div className="mx-auto w-full max-w-[1100px] px-6 py-7 lg:px-8">
        <div className="flex items-center gap-2 text-sm font-medium text-[#667085]">
          <Link
            href="/admin/paths"
            className="transition hover:text-[#4F46E5]"
          >
            Learning Paths
          </Link>

          <ChevronRightIcon />

          <span className="text-[#344054]">
            Add Learning Path
          </span>
        </div>

        <div className="mt-3">
          <h1 className="text-3xl font-bold tracking-tight text-[#172033]">
            Add Learning Path
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
            Create a structured learning
            sequence and then add games
            in the order students should
            complete them.
          </p>
        </div>

        <div className="mt-7">
          <AddLearningPathForm
            isSuperAdmin={isSuperAdmin}
            schools={schools}
            schoolId={
              profile.school_id || null
            }
          />
        </div>
      </div>
    </main>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-[#98A2B3]"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

