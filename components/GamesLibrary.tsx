"use client";

import {
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PrimaryAddButton from "@/components/PrimaryAddButton";

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

type GamesLibraryProps = {
  games: GameRow[];
  subjects: SubjectRow[];
  skills: SkillRow[];
  packages: PackageRow[];
  isSuperAdmin: boolean;
};

export default function GamesLibrary({
  games,
  subjects,
  skills,
  packages,
  isSuperAdmin,
}: GamesLibraryProps) {
  const router = useRouter();

  const [search, setSearch] =
    useState("");

  const [
    subjectFilter,
    setSubjectFilter,
  ] = useState("all");

  const [
    skillFilter,
    setSkillFilter,
  ] = useState("all");

  const availableSkills =
    skills.filter(
      (skill) =>
        skill.is_active &&
        (
          subjectFilter ===
            "all" ||
          skill.subject_id ===
            subjectFilter
        )
    );

  const filteredGames =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return games.filter(
        (game) => {
          const subject =
            subjects.find(
              (item) =>
                item.id ===
                game.subject_id
            );

          const skill =
            skills.find(
              (item) =>
                item.id ===
                game.skill_id
            );

          const matchesSearch =
            !query ||
            game.name
              .toLowerCase()
              .includes(query) ||
            (
              game.description ||
              ""
            )
              .toLowerCase()
              .includes(query) ||
            (
              subject?.name ||
              ""
            )
              .toLowerCase()
              .includes(query) ||
            (
              skill?.name ||
              ""
            )
              .toLowerCase()
              .includes(query);

          const matchesSubject =
            subjectFilter ===
              "all" ||
            game.subject_id ===
              subjectFilter;

          const matchesSkill =
            skillFilter ===
              "all" ||
            game.skill_id ===
              skillFilter;

          return (
            matchesSearch &&
            matchesSubject &&
            matchesSkill
          );
        }
      );
    }, [
      games,
      subjects,
      skills,
      search,
      subjectFilter,
      skillFilter,
    ]);

  function handleSubjectFilter(
    value: string
  ) {
    setSubjectFilter(value);
    setSkillFilter("all");
  }

  function goToAddGame() {
    if (!isSuperAdmin) {
      return;
    }

    router.push(
      "/admin/games/add"
    );
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex w-full flex-col gap-3 md:flex-row xl:max-w-4xl">
          <div className="relative min-w-0 flex-1">
            <SearchIcon />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search games..."
              className="h-12 w-full rounded-xl border border-[#D8DEEA] bg-white pl-11 pr-4 text-sm text-[#172033] outline-none transition placeholder:text-[#98A2B3] focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10"
            />
          </div>

          <select
            value={
              subjectFilter
            }
            onChange={(event) =>
              handleSubjectFilter(
                event.target.value
              )
            }
            className="h-12 min-w-[170px] rounded-xl border border-[#D8DEEA] bg-white px-4 text-sm font-medium text-[#475467] outline-none focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10"
          >
            <option value="all">
              All Subjects
            </option>

            {subjects.map(
              (subject) => (
                <option
                  key={
                    subject.id
                  }
                  value={
                    subject.id
                  }
                >
                  {
                    subject.name
                  }
                </option>
              )
            )}
          </select>

          <select
            value={skillFilter}
            onChange={(event) =>
              setSkillFilter(
                event.target.value
              )
            }
            className="h-12 min-w-[170px] rounded-xl border border-[#D8DEEA] bg-white px-4 text-sm font-medium text-[#475467] outline-none focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10"
          >
            <option value="all">
              All Skills
            </option>

            {availableSkills.map(
              (skill) => (
                <option
                  key={skill.id}
                  value={skill.id}
                >
                  {skill.name}
                </option>
              )
            )}
          </select>
        </div>

        {isSuperAdmin && (
          <PrimaryAddButton
            onClick={goToAddGame}
            className="self-start xl:self-auto"
          >
            Add Game
          </PrimaryAddButton>
        )}
      </div>

      {games.length === 0 ? (
        <EmptyState
          isSuperAdmin={
            isSuperAdmin
          }
          onAdd={
            goToAddGame
          }
        />
      ) : filteredGames.length ===
        0 ? (
        <div className="rounded-2xl border border-[#E3E8F2] bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#6366F1]">
            <GameIcon />
          </div>

          <h2 className="mt-5 text-lg font-bold text-[#172033]">
            No games found
          </h2>

          <p className="mt-2 text-sm text-[#667085]">
            Try changing your
            search or filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredGames.map(
            (game) => (
              <GameCard
                key={game.id}
                game={game}
                subject={
                  subjects.find(
                    (subject) =>
                      subject.id ===
                      game.subject_id
                  ) || null
                }
                skill={
                  skills.find(
                    (skill) =>
                      skill.id ===
                      game.skill_id
                  ) || null
                }
                packageStatus={
                  isSuperAdmin
                    ? packages.find(
                        (item) =>
                          item.game_id ===
                          game.id
                      )
                        ?.processing_status ||
                      null
                    : null
                }
                isSuperAdmin={
                  isSuperAdmin
                }
              />
            )
          )}
        </div>
      )}
    </section>
  );
}

function GameCard({
  game,
  subject,
  skill,
  packageStatus,
  isSuperAdmin,
}: {
  game: GameRow;
  subject: SubjectRow | null;
  skill: SkillRow | null;
  packageStatus:
    | string
    | null;
  isSuperAdmin: boolean;
}) {
  return (
    <Link
      href={`/admin/games/${game.id}`}
      className="group overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#CDD5E4] hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#EEF0FF]">
        {game.image_path ? (
          <img
            src={getGameImageUrl(
              game.image_path
            )}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-[#6366F1] shadow-sm">
              <GameIcon />
            </div>
          </div>
        )}

        <div className="absolute left-3 top-3">
          <GameStatusBadge
            status={
              game.status
            }
          />
        </div>

        {isSuperAdmin &&
          packageStatus && (
            <div className="absolute right-3 top-3">
              <PackageBadge
                status={
                  packageStatus
                }
              />
            </div>
          )}
      </div>

      <div className="p-4">
        <h2 className="line-clamp-2 text-base font-bold leading-6 text-[#172033] transition group-hover:text-[#4F46E5]">
          {game.name}
        </h2>

        <div className="mt-3 flex min-h-6 flex-wrap gap-2">
          {subject ? (
            <span className="rounded-lg bg-[#EEF0FF] px-2.5 py-1 text-[11px] font-semibold text-[#4F46E5]">
              {subject.name}
            </span>
          ) : (
            <span className="rounded-lg bg-[#F2F4F7] px-2.5 py-1 text-[11px] font-semibold text-[#98A2B3]">
              Uncategorized
            </span>
          )}

          {skill && (
            <span className="rounded-lg bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-semibold text-[#667085] ring-1 ring-[#E8ECF4]">
              {skill.name}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#EDF0F5] pt-3">
          {isSuperAdmin ? (
            <span className="text-xs font-medium text-[#98A2B3]">
              SCORM package
            </span>
          ) : (
            <span className="text-xs font-medium text-[#98A2B3]">
              Game details
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#6366F1]">
            Manage
            <ChevronRightIcon />
          </span>
        </div>
      </div>
    </Link>
  );
}

function GameStatusBadge({
  status,
}: {
  status: string;
}) {
  const published =
    status === "published";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${
        published
          ? "bg-emerald-50 text-emerald-700"
          : "bg-white/95 text-[#667085]"
      }`}
    >
      {published
        ? "Published"
        : "Draft"}
    </span>
  );
}

function PackageBadge({
  status,
}: {
  status: string;
}) {
  const label =
    status === "ready"
      ? "Ready"
      : status === "failed"
        ? "Failed"
        : status ===
            "processing"
          ? "Processing"
          : "Pending";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${
        status === "ready"
          ? "bg-[#EEF0FF] text-[#4F46E5]"
          : status ===
              "failed"
            ? "bg-red-50 text-red-700"
            : "bg-white/95 text-[#667085]"
      }`}
    >
      {label}
    </span>
  );
}

function EmptyState({
  isSuperAdmin,
  onAdd,
}: {
  isSuperAdmin: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#E3E8F2] bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#6366F1]">
        <GameIcon />
      </div>

      <h2 className="mt-5 text-lg font-bold text-[#172033]">
        {isSuperAdmin
          ? "Add your first game"
          : "No games available"}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085]">
        {isSuperAdmin
          ? "Upload a SCORM game, choose its subject and skill, and add artwork so it is easy to recognize in the library."
          : "There are currently no games available in the learning library."}
      </p>

      {isSuperAdmin && (
        <div className="mt-6 flex justify-center">
          <PrimaryAddButton
            onClick={onAdd}
          >
            Add Game
          </PrimaryAddButton>
        </div>
      )}
    </div>
  );
}

function getGameImageUrl(
  imagePath: string
) {
  if (
    imagePath.startsWith(
      "http://"
    ) ||
    imagePath.startsWith(
      "https://"
    )
  ) {
    return imagePath;
  }

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return "";
  }

  return `${supabaseUrl}/storage/v1/object/public/game-images/${imagePath}`;
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
      />

      <path d="m20 20-3.5-3.5" />
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
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M8 9h8a5 5 0 0 1 4.8 6.4l-.7 2.2a2 2 0 0 1-3.3.8L14.4 16H9.6l-2.4 2.4a2 2 0 0 1-3.3-.8l-.7-2.2A5 5 0 0 1 8 9Z" />
      <path d="M8 13h3" />
      <path d="M9.5 11.5v3" />
      <path d="M16 12.5h.01" />
      <path d="M18 14.5h.01" />
    </svg>
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
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}