import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import GamesLibrary from "@/components/GamesLibrary";

type GameRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  scorm_version: string | null;
  launch_file: string | null;
  image_path: string | null;
  subject_id: string | null;
  skill_id: string | null;
  created_at: string;
  updated_at: string;
};

type SubjectRow = {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

type SkillRow = {
  id: string;
  subject_id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

type PackageRow = {
  game_id: string;
  processing_status: string;
};

export default async function GamesPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: authError,
  } =
    await supabase.auth.getUser();

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
      "role, is_active"
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

  const admin =
    createAdminClient();

  /*
   * Games, subjects and skills are
   * part of the shared LumenTrail
   * content library.
   *
   * Do not include SCORM package
   * information in the main game
   * query.
   */
  const [
    gamesResult,
    subjectsResult,
    skillsResult,
  ] = await Promise.all([
    admin
      .from("games")
      .select(
        `
          id,
          name,
          description,
          status,
          image_path,
          subject_id,
          skill_id,
          created_at,
          updated_at
        `
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      ),

    admin
      .from("subjects")
      .select(
        `
          id,
          name,
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
  ]);

  /*
   * SCORM package information is
   * sensitive package-management data.
   *
   * Only Super Admin receives it.
   */
  let packagesResult: {
    data:
      | PackageRow[]
      | null;
    error:
      | {
          message: string;
        }
      | null;
  } = {
    data: [],
    error: null,
  };

  if (isSuperAdmin) {
    const result =
      await admin
        .from("scorm_packages")
        .select(
          `
            game_id,
            processing_status
          `
        );

    packagesResult = {
      data:
        (result.data ||
          []) as PackageRow[],
      error:
        result.error
          ? {
              message:
                result.error.message,
            }
          : null,
    };
  }

  const rawGames =
    gamesResult.data || [];

  /*
   * GamesLibrary still uses these
   * properties internally.
   *
   * For Super Admin they can later be
   * populated where needed.
   *
   * School Admin receives no SCORM
   * values from the database.
   */
  const games: GameRow[] =
    rawGames.map(
      (game) => ({
        ...game,
        scorm_version: null,
        launch_file: null,
      })
    );

  const subjects =
    (subjectsResult.data ||
      []) as SubjectRow[];

  const skills =
    (skillsResult.data ||
      []) as SkillRow[];

  const packages =
    isSuperAdmin
      ? packagesResult.data ||
        []
      : [];

  const totalGames =
    games.length;

  const publishedGames =
    games.filter(
      (game) =>
        game.status ===
        "published"
    ).length;

  const draftGames =
    games.filter(
      (game) =>
        game.status !==
        "published"
    ).length;

  const readyGames =
    isSuperAdmin
      ? packages.filter(
          (item) =>
            item.processing_status ===
            "ready"
        ).length
      : 0;

  const loadError =
    gamesResult.error ||
    subjectsResult.error ||
    skillsResult.error ||
    (
      isSuperAdmin
        ? packagesResult.error
        : null
    );

  return (
    <main className="min-h-screen bg-[#F4F7FB] p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-layout">

          <h1 className="text-3xl font-bold tracking-tight text-[#172033]">
            Games
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
            Manage your interactive
            learning games and
            organize them by subject
            and skill.
          </p>
        </div>

        <section
          className={`mb-layout grid gap-layout sm:grid-cols-2 ${
            isSuperAdmin
              ? "xl:grid-cols-4"
              : "xl:grid-cols-3"
          }`}
        >
          <StatCard
            label="Total Games"
            value={totalGames}
            detail="Games in your library"
          />

          <StatCard
            label="Published"
            value={publishedGames}
            detail="Available learning content"
          />

          <StatCard
            label="Drafts"
            value={draftGames}
            detail="Not yet published"
          />

          {isSuperAdmin && (
            <StatCard
              label="SCORM Ready"
              value={readyGames}
              detail="Packages ready to launch"
            />
          )}
        </section>

        {loadError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-medium text-red-700">
            Unable to load the game
            library.
          </div>
        ) : (
          <GamesLibrary
            packages={packages}
            games={games}
            subjects={
              subjects
            }
            skills={skills}
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
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E3E8F2] bg-white px-5 py-3 shadow-sm">
      <p className="text-sm font-semibold text-[#667085]">
        {label}
      </p>

      <p className="mt-1 text-3xl font-bold tracking-tight text-[#172033]">
        {value}
      </p>

      <p className="mt-1 text-xs text-[#98A2B3]">
        {detail}
      </p>
    </div>
  );
}
