import { loadGameClassifications } from "@/lib/lms/game-skills-server";
import { gameSubjectIds } from "@/lib/lms/game-skills";
import PathGameTiles from "@/components/PathGameTiles";
import PathStudents from "@/components/PathStudents";

import ActionIcon from "@/components/ActionIcon";
import Link from "next/link";
import PrimaryAddLink from "@/components/PrimaryAddLink";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type LearningPath = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  school_id: string | null;
  created_at: string;
  updated_at: string;
};

type School = {
  id: string;
  name: string;
};

type PathGameRow = {
  id: string;
  board_id: string;
  game_id: string;
  sort_order: number;
};

type GameRow = {
  id: string;
  name: string;
  description: string | null;
  image_path: string | null;
  orientation_mode: string | null;
  subject_id: string | null;
  skill_id: string | null;
  skill_ids?:string[];
  subject_ids?:string[];
  status: string;
};

type SubjectRow = {
  id: string;
  name: string;
};

export default async function ManageLearningPathPage({
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

  // Match the authorized server read used by the library and creation API.
  // School ownership is checked before loading related path content.
  const admin = createAdminClient();

  // Fetch server-side, then enforce the authenticated role and school below.
  const {
    data: pathData,
    error: pathError,
  } = await admin
    .from("learning_boards")
    .select(
      `
        id,
        name,
        description,
        status,
        school_id,
        created_at,
        updated_at
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (pathError) {
    console.error(
      "Unable to load Learning Path:",
      pathError
    );

    throw new Error("Unable to load the saved Learning Path. Please reload the page.");
  }

  if (!pathData) {
    notFound();
  }

  const path =
    pathData as LearningPath;

  /*
   * Explicitly enforce school ownership
   * as an additional application-level
   * protection for School Admins.
   */
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

  /*
   * Load the ordered game relationships.
   */
  const {
    data: pathGameData,
    error: pathGamesError,
  } = await admin
    .from("learning_board_games")
    .select(
      `
        id,
        board_id,
        game_id,
        sort_order
      `
    )
    .eq("board_id", id)
    .order(
      "sort_order",
      {
        ascending: true,
      }
    );

  if (pathGamesError) {
    console.error(
      "Unable to load Learning Path games:",
      pathGamesError
    );
  }

  const pathGames =
    (pathGameData ||
      []) as PathGameRow[];

  const gameIds =
    pathGames.map(
      (row) => row.game_id
    );

  let games: GameRow[] = [];

  if (gameIds.length > 0) {
    const {
      data,
      error,
    } = await admin
      .from("games")
      .select(
        `
          id,
          name,
          description,
          image_path,
          orientation_mode,
          subject_id,
          skill_id,
          status
        `
      )
      .in("id", gameIds);

    if (error) {
      console.error(
        "Unable to load games for Learning Path:",
        error
      );
    } else {
      games =
        await loadGameClassifications(admin,(data || []) as GameRow[]);
    }
  }

  const subjectIds =
    Array.from(
      new Set(
        games
          .flatMap(game=>gameSubjectIds(game))
          .filter(
            (
              subjectId
            ): subjectId is string =>
              Boolean(subjectId)
          )
      )
    );

  let subjects:
    SubjectRow[] = [];

  if (
    subjectIds.length > 0
  ) {
    const {
      data,
      error,
    } = await admin
      .from("subjects")
      .select("id, name")
      .in("id", subjectIds);

    if (error) {
      console.error(
        "Unable to load Learning Path subjects:",
        error
      );
    } else {
      subjects =
        (data ||
          []) as SubjectRow[];
    }
  }

  const gameMap =
    new Map(
      games.map((game) => [
        game.id,
        game,
      ])
    );

  const subjectMap =
    new Map(
      subjects.map(
        (subject) => [
          subject.id,
          subject.name,
        ]
      )
    );

  const orderedGames =
    pathGames
      .map((row) => {
        const game =
          gameMap.get(
            row.game_id
          );

        if (!game) {
          return null;
        }

        return {
          relationId:
            row.id,
          sortOrder:
            row.sort_order,
          game,
        };
      })
      .filter(
        (
          item
        ): item is NonNullable<
          typeof item
        > => Boolean(item)
      );

  return (
    <main className="min-h-full bg-[#F4F7FB]">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-7 lg:px-8">
        <div className="flex items-center gap-2 text-sm font-medium text-[#667085]">
          <Link
            href="/admin/paths"
            className="transition hover:text-[#4F46E5]"
          >
            Learning Paths
          </Link>

          <ChevronRightIcon />

          <span className="max-w-[360px] truncate text-[#344054]">
            {path.name}
          </span>
        </div>

        <div className="mt-layout flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-[#172033]">
                {path.name}
              </h1>

              <StatusBadge
                status={
                  path.status
                }
              />
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
              {path.description ||
                "No description has been added to this Learning Path."}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {school && (
                <InfoBadge
                  icon={
                    <SchoolIcon />
                  }
                >
                  {school.name}
                </InfoBadge>
              )}

              <InfoBadge
                icon={<GameIcon />}
              >
                {orderedGames.length ===
                1
                  ? "1 game"
                  : `${orderedGames.length} games`}
              </InfoBadge>

              <InfoBadge
                icon={
                  <CalendarIcon />
                }
              >
                Updated{" "}
                {formatDate(
                  path.updated_at
                )}
              </InfoBadge>
            </div>
          </div>

          <Link
            href={`/admin/paths/${path.id}/edit`}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-[#C7CCF8] bg-[#F5F5FF] px-4 text-sm font-semibold text-[#4F46E5] transition hover:bg-[#ECEEFF]"
          >
            <EditIcon />
            Edit Details
          </Link>
        </div>

        <div className="mt-layout grid gap-layout xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-[#E8ECF4] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#172033]">
                  Games in this Path
                </h2>

                <p className="mt-1 text-sm leading-5 text-[#667085]">
                  Students will
                  complete games in
                  this order.
                </p>
              </div>

              <PrimaryAddLink href={`/admin/paths/${path.id}/games`}>Manage Games</PrimaryAddLink>
            </div>

            {pathGamesError ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <ErrorIcon />
                </div>

                <h3 className="mt-4 text-base font-semibold text-[#172033]">
                  Unable to load games
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085]">
                  The games in this
                  Learning Path could
                  not be loaded.
                </p>
              </div>
            ) : orderedGames.length ===
              0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#6366F1]">
                  <GameIcon />
                </div>

                <h3 className="mt-4 text-base font-semibold text-[#172033]">
                  No games added yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085]">
                  Add games from the
                  LumenTrail library
                  and arrange them in
                  the order students
                  should complete
                  them.
                </p>


              </div>
            ) : (
              <PathGameTiles key={path.updated_at} pathId={path.id} updatedAt={path.updated_at} games={orderedGames.map(item => ({ id: item.game.id, name: item.game.name, imageUrl: getGameImageUrl(item.game.image_path), subject: gameSubjectIds(item.game).map(id=>subjectMap.get(id)).filter(Boolean).join(", ") || null, orientation: item.game.orientation_mode || "landscape" }))} />
            )}
          </section>

          <aside className="stack-layout">
            {path.school_id && <PathStudents pathId={path.id} active={path.status === "active"} />}
            <div className="rounded-2xl border border-[#E3E8F2] bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-[#172033]">
                Path Information
              </h2>

              <dl className="mt-4 space-y-4">
                <InfoRow
                  label="Status"
                  value={
                    path.status ===
                    "active"
                      ? "Active"
                      : "Archived"
                  }
                />

                <InfoRow
                  label="Games"
                  value={String(
                    orderedGames.length
                  )}
                />

                {school && (
                  <InfoRow
                    label="School"
                    value={
                      school.name
                    }
                  />
                )}

                <InfoRow
                  label="Created"
                  value={formatDate(
                    path.created_at
                  )}
                />

                <InfoRow
                  label="Last Updated"
                  value={formatDate(
                    path.updated_at
                  )}
                />
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-sm text-[#667085]">
        {label}
      </dt>

      <dd className="max-w-[170px] text-right text-sm font-semibold text-[#344054]">
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
      Archived
    </span>
  );
}

function InfoBadge({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#E3E8F2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#667085]">
      <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">
        {icon}
      </span>

      <span className="truncate">
        {children}
      </span>
    </span>
  );
}

function getGameImageUrl(
  imagePath: string | null
) {
  if (!imagePath) {
    return null;
  }

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  return `${supabaseUrl}/storage/v1/object/public/game-images/${imagePath}`;
}

function formatDate(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(date);
}

function ChevronRightIcon() { return <ActionIcon name="next" />; }

function EditIcon() { return <ActionIcon name="edit" />; }

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
      <path d="M8 8h8a5 5 0 0 1 4.7 6.7l-1 2.8a2 2 0 0 1-3.3.8L14 16h-4l-2.4 2.3a2 2 0 0 1-3.3-.8l-1-2.8A5 5 0 0 1 8 8Z" />
      <path d="M8 12v4" />
      <path d="M6 14h4" />
      <path d="M16.5 12.5h.01" />
      <path d="M18.5 14.5h.01" />
    </svg>
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
      <path d="m3 10 9-5 9 5" />
      <path d="M5 10v8" />
      <path d="M19 10v8" />
      <path d="M8 12v6" />
      <path d="M12 12v6" />
      <path d="M16 12v6" />
      <path d="M3 19h18" />
    </svg>
  );
}

function CalendarIcon() {
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
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
      />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
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
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}
