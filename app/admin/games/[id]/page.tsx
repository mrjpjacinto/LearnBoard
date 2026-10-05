import Image from "next/image";
import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import GameEditForm from "@/components/GameEditForm";
import GamePublishing from "@/components/GamePublishing";
import ScormPackageActions from "@/components/ScormPackageActions";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type GameRow = {
  id: string;
  name: string;
  description: string | null;
  subject_id: string | null;
  orientation_mode: string;
  image_path: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type SubjectRow = {
  id: string;
  name: string;
};

type PackageRow = {
  id: string;
  file_name: string;
  storage_path: string;
  scorm_version: string | null;
  manifest_path: string | null;
  launch_file: string | null;
  package_size: number | null;
  extraction_path: string | null;
  processing_status: string;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
};

type ReadinessState =
  | "success"
  | "failed"
  | "pending";

export default async function GameManagePage({
  params,
}: PageProps) {
  const { id } = await params;

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

  const isSuperAdmin =
    profile.role ===
    "super_admin";

  const admin =
    createAdminClient();

  /*
   * Only fetch general game
   * information here.
   *
   * SCORM-specific information is
   * intentionally excluded from this
   * query so School Admin never
   * receives it.
   */
  const {
    data: gameData,
    error: gameError,
  } = await admin
    .from("games")
    .select(
      `
        id,
        name,
        description,
        subject_id,
        orientation_mode,
        image_path,
        status,
        created_at,
        updated_at
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (
    gameError ||
    !gameData
  ) {
    notFound();
  }

  const game =
    gameData as GameRow;

  const {
    data: subjectData,
  } = await admin
    .from("subjects")
    .select(
      `
        id,
        name
      `
    )
    .eq("is_active", true)
    .order("sort_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  const subjects =
    (subjectData ||
      []) as SubjectRow[];

  /*
   * SCORM package information is
   * fetched only for Super Admin.
   */
  let packageRecord:
    | PackageRow
    | null = null;

  if (isSuperAdmin) {
    const {
      data: packageData,
    } = await admin
      .from("scorm_packages")
      .select(
        `
          id,
          file_name,
          storage_path,
          scorm_version,
          manifest_path,
          launch_file,
          package_size,
          extraction_path,
          processing_status,
          processing_error,
          created_at,
          updated_at
        `
      )
      .eq("game_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    packageRecord =
      packageData as
        | PackageRow
        | null;
  }

  const processingStatus =
    packageRecord
      ?.processing_status ||
    "missing";

  const isProcessing =
    processingStatus ===
      "pending" ||
    processingStatus ===
      "processing";

  const processingFailed =
    processingStatus ===
    "failed";

  const processingReady =
    processingStatus ===
    "ready";

  const zipState:
    ReadinessState =
    packageRecord
      ? "success"
      : "pending";

  const manifestState =
    getReadinessState({
      packageExists:
        Boolean(packageRecord),
      isProcessing,
      processingFailed,
      processingReady,
      passed: Boolean(
        packageRecord
          ?.manifest_path
      ),
    });

  const scormState =
    getReadinessState({
      packageExists:
        Boolean(packageRecord),
      isProcessing,
      processingFailed,
      processingReady,
      passed: Boolean(
        packageRecord
          ?.scorm_version
      ),
    });

  const launchState =
    getReadinessState({
      packageExists:
        Boolean(packageRecord),
      isProcessing,
      processingFailed,
      processingReady,
      passed: Boolean(
        packageRecord
          ?.launch_file
      ),
    });

  const packageReadyState:
    ReadinessState =
    !packageRecord ||
    isProcessing
      ? "pending"
      : processingReady &&
          Boolean(
            packageRecord
              .manifest_path
          ) &&
          Boolean(
            packageRecord
              .scorm_version
          ) &&
          Boolean(
            packageRecord
              .launch_file
          )
        ? "success"
        : "failed";

  return (
    <main className="min-h-screen bg-[#F4F7FB] p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-layout">
          <Link
            href="/admin/games"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#667085] transition hover:text-[#6366F1]"
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
              <path d="m15 18-6-6 6-6" />
            </svg>

            Back to Games
          </Link>

          <div className="mt-layout flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>

              <h1 className="text-3xl font-bold tracking-tight text-[#172033]">
                {game.name}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
                {isSuperAdmin ? "Edit the information and settings for this game." : "View this learning material and its details."}
              </p>
            </div>

            {isSuperAdmin && (
              <GameStatus
                status={
                  game.status
                }
              />
            )}
          </div>
        </div>

        <div
          className={
            isSuperAdmin
              ? "grid gap-layout xl:grid-cols-[minmax(0,1fr)_360px]"
              : ""
          }
        >
          <div>
            {isSuperAdmin && <div className="mb-4"><GamePublishing gameId={game.id} status={game.status} /></div>}
            {isSuperAdmin ? (
            <GameEditForm
              game={{
                id: game.id,
                name: game.name,
                description:
                  game.description,
                subject_id:
                  game.subject_id,
                orientation_mode:
                  game.orientation_mode,
                image_path:
                  game.image_path,
              }}
              subjects={subjects}
              isSuperAdmin={
                isSuperAdmin
              }
            />
            ) : (
              <section className="rounded-2xl border border-[#E3E8F2] bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-[#172033]">Game Details</h2>
                <p className="mt-2 text-sm text-[#667085]">Games are managed by Super Admin. You can add this material to Learning Paths for your school.</p>
                {game.image_path && <div className="mt-layout aspect-[4/3] max-w-lg overflow-hidden rounded-xl bg-[#EEF0FF]"><Image unoptimized src={/^https?:\/\//.test(game.image_path) ? game.image_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/game-images/${game.image_path.split("/").map(encodeURIComponent).join("/")}`} alt={game.name} width={800} height={600} className="h-full w-full object-cover" /></div>}
                <dl className="mt-layout space-y-4">
                  <DetailRow label="Name" value={game.name} />
                  <DetailRow label="Description" value={game.description || "No description added."} />
                  <DetailRow label="Subject" value={subjects.find(s => s.id === game.subject_id)?.name || "Uncategorized"} />
                  <DetailRow label="Orientation" value={game.orientation_mode || "landscape"} />
                </dl>
              </section>
            )}
          </div>

          {isSuperAdmin && (
            <aside className="stack-layout">
              <section className="overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-sm">
                <div className="border-b border-[#E8ECF4] px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-[#172033]">
                        SCORM Package
                      </h2>

                      <p className="mt-1 text-xs leading-5 text-[#667085]">
                        Package information
                        and management
                      </p>
                    </div>

                    <span className="rounded-full bg-[#EEF0FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#4F46E5]">
                      Super Admin
                    </span>
                  </div>
                </div>

                {!packageRecord ? (
                  <div className="p-5">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-800">
                      No SCORM package is
                      attached to this
                      game.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-[#EEF1F6]">
                      <DetailRow
                        label="File"
                        value={
                          packageRecord.file_name
                        }
                      />

                      <DetailRow
                        label="Package Size"
                        value={
                          packageRecord.package_size
                            ? formatFileSize(
                                packageRecord.package_size
                              )
                            : "—"
                        }
                      />

                      <DetailRow
                        label="Created"
                        value={formatDate(
                          game.created_at
                        )}
                      />

                      <DetailRow
                        label="Last Updated"
                        value={formatDate(
                          game.updated_at
                        )}
                      />
                    </div>

                    {packageRecord.processing_error && (
                      <div className="border-t border-[#EEF1F6] p-5">
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                          <p className="text-sm font-semibold text-red-700">
                            Package validation
                            failed
                          </p>

                          <p className="mt-2 text-sm leading-6 text-red-700">
                            {
                              packageRecord.processing_error
                            }
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-[#EEF1F6] p-5">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#98A2B3]">
                        Package Actions
                      </p>

                      <ScormPackageActions
                        gameId={
                          game.id
                        }
                      />

                      <p className="mt-3 text-xs leading-5 text-[#98A2B3]">
                        Download and package
                        management are restricted
                        to Super Admin.
                      </p>
                    </div>
                  </>
                )}
              </section>

              <section className="rounded-2xl border border-[#E3E8F2] bg-white p-5 shadow-sm">
                <h2 className="font-bold text-[#172033]">
                  Package Readiness
                </h2>

                <div className="mt-layout space-y-4">
                  <ReadinessItem
                    label="ZIP uploaded"
                    state={
                      zipState
                    }
                  />

                  <ReadinessItem
                    label="Manifest found"
                    state={
                      manifestState
                    }
                  />

                  <ReadinessItem
                    label="SCORM detected"
                    state={
                      scormState
                    }
                  />

                  <ReadinessItem
                    label="Launch file verified"
                    state={
                      launchState
                    }
                  />

                  <ReadinessItem
                    label="Package ready"
                    state={
                      packageReadyState
                    }
                  />
                </div>

                {processingFailed &&
                  packageRecord
                    ?.processing_error && (
                    <div className="mt-layout rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                        Package Error
                      </p>

                      <p className="mt-1 text-sm leading-5 text-red-700">
                        {
                          packageRecord.processing_error
                        }
                      </p>
                    </div>
                  )}
              </section>
            </aside>
          )}
        </div>
      </div>
    </main>
  );
}

function getReadinessState({
  packageExists,
  isProcessing,
  processingFailed,
  processingReady,
  passed,
}: {
  packageExists: boolean;
  isProcessing: boolean;
  processingFailed: boolean;
  processingReady: boolean;
  passed: boolean;
}): ReadinessState {
  if (!packageExists) {
    return "pending";
  }

  if (passed) {
    return "success";
  }

  if (isProcessing) {
    return "pending";
  }

  if (
    processingFailed ||
    processingReady
  ) {
    return "failed";
  }

  return "pending";
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#98A2B3]">
        {label}
      </p>

      <p className="mt-1.5 break-all text-sm font-semibold leading-5 text-[#344054]">
        {value}
      </p>
    </div>
  );
}

function ReadinessItem({
  label,
  state,
}: {
  label: string;
  state: ReadinessState;
}) {
  const success =
    state === "success";

  const failed =
    state === "failed";

  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          success
            ? "bg-emerald-50 text-emerald-600"
            : failed
              ? "bg-red-50 text-red-600"
              : "bg-slate-100 text-slate-400"
        }`}
      >
        {success ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="m5 12 4 4L19 6" />
          </svg>
        ) : failed ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M6 6l12 12" />
            <path d="M18 6 6 18" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M7 12h10" />
          </svg>
        )}
      </span>

      <span
        className={`text-sm font-medium ${
          failed
            ? "text-red-700"
            : success
              ? "text-[#344054]"
              : "text-[#98A2B3]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function GameStatus({
  status,
}: {
  status: string;
}) {
  const published =
    status === "published";

  return (
    <span
      className={`inline-flex self-start rounded-full px-3 py-1.5 text-xs font-semibold ${
        published
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

function formatStatus(
  value: string
) {
  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatFileSize(
  bytes: number
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes =
    bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(
      1
    )} KB`;
  }

  return `${(
    kilobytes / 1024
  ).toFixed(1)} MB`;
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(new Date(value));
}