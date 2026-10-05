
import ActionIcon from "@/components/ActionIcon";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageAuth, checkDb } from "@/lib/lms/auth";
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

  const { admin, profile } = await pageAuth();
  let query = admin.from("learning_boards")
    .select("id,name,description,status,school_id").eq("id", id);
  if (profile.role !== "super_admin") query = query.eq("school_id", profile.school_id!);
  const { data: pathData, error: pathError } = await query.maybeSingle();
  checkDb(pathError);
  if (!pathData) notFound();
  const path = pathData as LearningPath;

  let school: School | null =
    null;

  if (path.school_id) {
    const {
      data: schoolData,
      error: schoolError,
    } = await admin
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

        <div className="mt-layout">
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

function ChevronRightIcon() { return <ActionIcon name="next" />; }