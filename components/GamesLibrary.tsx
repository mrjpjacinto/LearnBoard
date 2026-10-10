"use client";
import { gameSkillIds, hasGameSkill, hasGameSubject } from "@/lib/lms/game-skills";
import OutsideDetails from "./OutsideDetails";
import ActionIcon from "@/components/ActionIcon";


import {
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useCardDrag } from "./useCardDrag";
import { reorderGames } from "@/lib/ui/reorder-games";
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
  skill_ids?: string[];
  subject_ids?: string[];
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
  const stored = useSyncExternalStore(subscribeOrder, readOrder, () => "");
  const savedIds = useMemo(() => { try { const value: unknown = JSON.parse(stored); return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []; } catch { return []; } }, [stored]);
  const [sort, setSort] = useState("custom");
  const [direction, setDirection] = useState("ascending");
  const [customIds, setCustomIds] = useState<string[] | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [orderMessage, setOrderMessage] = useState("");
  const orderedGames = useMemo(() => {
    const ranks = new Map((customIds || savedIds).map((id, index) => [id, index]));
    return [...games].sort((a, b) => Number(!gameSkillIds(b).length) - Number(!gameSkillIds(a).length) || (sort === "az" ? (direction === "ascending" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)) : sort === "date" ? (direction === "ascending" ? Date.parse(a.created_at) - Date.parse(b.created_at) : Date.parse(b.created_at) - Date.parse(a.created_at)) : (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity) || Date.parse(b.created_at) - Date.parse(a.created_at)));
  }, [games, sort, direction, customIds, savedIds]);
  function moveGame(from: string, to: string) {
    const ids = reorderGames(orderedGames.map(g => g.id), from, to);
    setCustomIds(ids); setSort("custom");
    try { localStorage.setItem("learnboard-game-library-order", JSON.stringify(ids)); window.dispatchEvent(new Event("learnboard-library-order")); setOrderMessage("Custom order saved in this browser."); }
    catch { setOrderMessage("Custom order changed for this visit. Browser storage is unavailable."); }
  }

  const cardDrag = useCardDrag({ selector: "[data-library-game]", disabled: games.length < 2, onStart: setDragged, onTarget: setTarget, onDrop: moveGame, onEnd: () => { setDragged(null); setTarget(null); } });
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

      return orderedGames.filter(
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

          const assignedSkills = skills.filter(skill=>hasGameSkill(game,skill.id));
          const classificationMatches = assignedSkills.some(skill=>(skill.name+" "+(subjects.find(subject=>subject.id===skill.subject_id)?.name || "")).toLowerCase().includes(query));
          const matchesSearch =
            classificationMatches ||
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
            hasGameSubject(game,subjectFilter);

          const matchesSkill =
            skillFilter ===
              "all" ||
            hasGameSkill(game,skillFilter);

          return (
            matchesSearch &&
            matchesSubject &&
            matchesSkill
          );
        }
      );
    }, [
      orderedGames,
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
      <div className="mb-layout flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex w-full flex-col gap-3 md:flex-row md:flex-wrap">
          <div className="relative min-w-[200px] flex-1">
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
          <OutsideDetails className="relative min-w-40">
            <summary className="flex h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-xl border border-[#D8DEEA] bg-white px-4 text-sm font-medium text-[#475467] [&::-webkit-details-marker]:hidden">{sort === "custom" ? "Custom" : sort === "date" ? "Date Uploaded" : "A\u2013Z"}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4"><path d="m6 9 6 6 6-6" /></svg></summary>
            <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-[#D8DEEA] bg-white p-1.5 text-sm shadow-lg">
              <div role="group" aria-label="Sort games">{[["custom", "Custom"], ["date", "Date Uploaded"], ["az", "A\u2013Z"]].map(([value, label]) => <button type="button" key={value} aria-pressed={sort === value} onClick={() => setSort(value)} className={("inline-flex items-center gap-2 " + ("flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-[#F4F7FB] " + (sort === value ? "bg-[#EEF0FF] font-semibold text-[#4F46E5]" : "text-[#4F46E5]")))}><ActionIcon name="filter" className="inline-block h-4 w-4 shrink-0 align-middle mr-2" />{label}{sort === value && <span aria-hidden="true">&#10003;</span>}</button>)}</div>
              <hr className="my-1.5 border-[#E3E8F2]" />
              <div role="group" aria-label="Sort direction">{[["ascending", "Ascending"], ["descending", "Descending"]].map(([value, label]) => <button type="button" key={value} aria-pressed={direction === value} onClick={() => setDirection(value)} className={("inline-flex items-center gap-2 " + ("flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-[#F4F7FB] " + (direction === value ? "bg-[#EEF0FF] font-semibold text-[#4F46E5]" : "text-[#4F46E5]")))}><ActionIcon name="down" className="inline-block h-4 w-4 shrink-0 align-middle mr-2" />{label}{direction === value && <span aria-hidden="true">&#10003;</span>}</button>)}</div>
            </div>
          </OutsideDetails>
        </div>

        {isSuperAdmin && (
          <PrimaryAddButton
            onClick={goToAddGame}
            className="shrink-0 whitespace-nowrap self-start xl:self-auto"
          >
            Add Game
          </PrimaryAddButton>
        )}
      </div>

      <p className="mb-3 text-xs text-[#667085]">Press and hold a card to drag it into your preferred order.</p>
      <p role="status" className="sr-only">{orderMessage}</p>
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

          <h2 className="mt-layout text-lg font-bold text-[#172033]">
            No games found
          </h2>

          <p className="mt-2 text-sm text-[#667085]">
            Try changing your
            search or filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-layout sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1920px]:grid-cols-5">
          {filteredGames.map(
            (game) => (
              <div key={game.id} data-library-game={game.id} data-sort-id={game.id} {...cardDrag(game.id)} tabIndex={0} aria-label={`Reorder ${game.name}. Hold to drag or use arrow keys.`}
                onKeyDown={e => { const index = orderedGames.findIndex(g => g.id === game.id); const next = index + (e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0); if (next !== index && orderedGames[next]) { e.preventDefault(); moveGame(game.id, orderedGames[next].id); } }}
                className={`relative min-w-0 touch-none select-none self-start rounded-2xl ${target === game.id ? "ring-2 ring-[#6366F1]" : ""} ${dragged === game.id ? "opacity-50" : ""}`}>
              <GameCard
                game={game}
                assignedSkills={skills.filter(skill=>hasGameSkill(game,skill.id))}
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
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}

function GameCard({
  game,
  assignedSkills,
  packageStatus,
  isSuperAdmin,
}: {
  game: GameRow;
  assignedSkills: SkillRow[];
  packageStatus:
    | string
    | null;
  isSuperAdmin: boolean;
}) {
  return (
    <Link
      draggable={false}
      href={`/admin/games/${game.id}`}
      className="overview-card !h-auto group overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#CDD5E4] hover:shadow-md"
    >
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-[#EEF0FF]">
        {game.image_path ? (
          <img
            draggable={false}
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

{isSuperAdmin &&
          packageStatus && packageStatus !== "ready" && (
            <div className="absolute right-3 top-3">
              <PackageBadge
                status={
                  packageStatus
                }
              />
            </div>
          )}
      </div>

      <div className="flex h-44 flex-col p-4">
        <h2 className="line-clamp-2 h-12 shrink-0 text-base font-bold leading-6 text-[#172033] transition group-hover:text-[#4F46E5]">
          {game.name}
        </h2>

        <div className="mt-2 flex h-7 min-w-0 items-center gap-2">{assignedSkills.length ? <span className="inline-flex min-w-0 items-center rounded-lg bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#667085]"><span className="truncate">{assignedSkills[0].name}</span>{assignedSkills.length > 1 && <span className="ml-2 shrink-0">+{assignedSkills.length - 1}</span>}</span> : <span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">Unassigned</span>}</div>

        <div className="mt-auto flex items-center justify-between border-t border-[#EDF0F5] pt-3">
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
            {isSuperAdmin ? "Manage" : "View Details"}
            <ChevronRightIcon />
          </span>
        </div>
      </div>
    </Link>
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

      <h2 className="mt-layout text-lg font-bold text-[#172033]">
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
        <div className="mt-layout flex justify-center">
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

function ChevronRightIcon() { return <ActionIcon name="next" />; }
function subscribeOrder(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("learnboard-library-order", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("learnboard-library-order", callback); };
}
function readOrder() {
  try { return localStorage.getItem("learnboard-game-library-order") || ""; } catch { return ""; }
}
