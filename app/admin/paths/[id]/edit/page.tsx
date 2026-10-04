import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditLearningPathForm from "@/components/EditLearningPathForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type LearningPath = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  school_id: string | null;
};

type School = {
  id: string;
  name: string;
};

export default async function EditLearningPathPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase =
    await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (
    authError ||
    !user
  ) {
    redirect("/");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "role, is_active, school_id"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    ![
      "super_admin",
      "admin",
    ].includes(profile.role)
  ) {
    redirect("/");
  }

  const isSuperAdmin =
    profile.role ===
    "super_admin";

  const {
    data: pathData,
    error: pathError,
  } = await supabase
    .from("learning_boards")
    .select(
      `
        id,
        name,
        description,
        status,
        school_id
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (
    pathError ||
    !pathData
  ) {
    notFound();
  }

  const path =
    pathData as LearningPath;

  if (
    !isSuperAdmin &&
    (
      !profile.school_id ||
      path.school_id !==
        profile.school_id
    )
  ) {
    notFound();
  }

  let school: School | null =
    null;

  if (path.school_id) {
    const {
      data: schoolData,
      error: schoolError,
    } = await supabase
      .from("schools")
      .select("id, name")
      .eq(
        "id",
        path.school_id
      )
      .maybeSingle();

    if (schoolError) {
      console.error(
        "Unable to load Learning Path school:",
        schoolError
      );
    } else if (schoolData) {
      school =
        schoolData as School;
    }
  }

  return (
    <main className="min-h-full bg-[#F4F7FB]">
      <div className="mx-auto w-full max-w-[1100px] px-6 py-7 lg:px-8">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#667085]">
          <Link
            href="/admin/paths"
            className="transition hover:text-[#4F46E5]"
          >
            Learning Paths
          </Link>

          <ChevronRightIcon />

          <Link
            href={`/admin/paths/${path.id}`}
            className="max-w-[300px] truncate transition hover:text-[#4F46E5]"
          >
            {path.name}
          </Link>

          <ChevronRightIcon />

          <span className="text-[#344054]">
            Edit
          </span>
        </div>

        <div className="mt-3">
          <h1 className="text-3xl font-bold tracking-tight text-[#172033]">
            Edit Learning Path
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
            Update the Learning Path
            name, description, and
            status.
          </p>
        </div>

        <div className="mt-7">
          <EditLearningPathForm
            path={{
              id: path.id,
              name: path.name,
              description:
                path.description,
              status: path.status,
            }}
            schoolName={
              school?.name || null
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