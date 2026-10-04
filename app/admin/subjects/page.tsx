import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SubjectsSkillsManager from "@/components/SubjectsSkillsManager";

type SubjectRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

type SkillRow = {
  id: string;
  subject_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

export default async function SubjectsPage() {
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
    ![
      "super_admin",
      "admin",
    ].includes(profile.role)
  ) {
    redirect("/");
  }

  const admin =
    createAdminClient();

  const [
    subjectsResult,
    skillsResult,
    gamesResult,
  ] = await Promise.all([
    admin
      .from("subjects")
      .select(
        `
          id,
          name,
          description,
          is_active,
          sort_order
        `
      )
      .order(
        "sort_order",
        {
          ascending: true,
        }
      )
      .order(
        "name",
        {
          ascending: true,
        }
      ),

    admin
      .from("skills")
      .select(
        `
          id,
          subject_id,
          name,
          description,
          is_active,
          sort_order
        `
      )
      .order(
        "sort_order",
        {
          ascending: true,
        }
      )
      .order(
        "name",
        {
          ascending: true,
        }
      ),

    admin
      .from("games")
      .select(
        "id, subject_id, skill_id"
      ),
  ]);

  const subjects =
    (subjectsResult.data ||
      []) as SubjectRow[];

  const skills =
    (skillsResult.data ||
      []) as SkillRow[];

  const games =
    gamesResult.data || [];

  const totalSubjects =
    subjects.length;

  const totalSkills =
    skills.length;

  const activeSubjects =
    subjects.filter(
      (subject) =>
        subject.is_active
    ).length;

  const categorizedGames =
    games.filter(
      (game) =>
        Boolean(
          game.subject_id
        )
    ).length;

  return (
    <main className="min-h-screen bg-[#F4F7FB] p-6 lg:p-8">

      <div className="mx-auto max-w-[1500px]">

        <div className="mb-8">

          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6366F1]">
            Content Organization
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#172033]">
            Subjects & Skills
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
            Organize games into
            subjects such as Math
            and English, then use
            skills such as
            Multiplication,
            Division, Spelling or
            Reading for more
            specific grouping.
          </p>

        </div>

        <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            label="Subjects"
            value={
              totalSubjects
            }
            detail="Content categories"
          />

          <StatCard
            label="Active Subjects"
            value={
              activeSubjects
            }
            detail="Available for games"
          />

          <StatCard
            label="Skills"
            value={
              totalSkills
            }
            detail="Across all subjects"
          />

          <StatCard
            label="Categorized Games"
            value={
              categorizedGames
            }
            detail="Games assigned to a subject"
          />

        </section>

        {subjectsResult.error ||
        skillsResult.error ||
        gamesResult.error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-medium text-red-700">
            Unable to load Subjects
            & Skills.
          </div>
        ) : (
          <SubjectsSkillsManager
            subjects={
              subjects
            }
            skills={skills}
            games={games}
          />
        )}

      </div>

    </main>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E3E8F2] bg-white p-5 shadow-sm">

      <p className="text-sm font-semibold text-[#667085]">
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold tracking-tight text-[#172033]">
        {value}
      </p>

      <p className="mt-2 text-xs text-[#98A2B3]">
        {detail}
      </p>

    </div>
  );
}