"use client";
import { Notification } from "./LmsToast";
import ActionIcon from "@/components/ActionIcon";


import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type DeleteGameDangerZoneProps = {
  gameId: string;
  gameName: string;
  compact?: boolean;
};

export default function DeleteGameDangerZone({
  gameId,
  gameName,
  compact = false,
}: DeleteGameDangerZoneProps) {
  const router = useRouter();

  const [
    confirming,
    setConfirming,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    if (!error) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        setError("");
      }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [error]);

  async function handleDelete() {
    if (deleting) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/admin/games/${gameId}/delete`,
          {
            method: "DELETE",
          }
        );

      const responseText =
        await response.text();

      let result: {
        error?: string;
        success?: boolean;
      } = {};

      if (responseText) {
        try {
          result =
            JSON.parse(
              responseText
            );
        } catch {
          throw new Error(
            `Unable to delete the game. The server returned an unexpected response (${response.status}).`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to delete the game."
        );
      }

      router.replace(
        "/admin/games"
      );

      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete the game."
      );

      setDeleting(false);
    }
  }

  const deleteButton = (
    <button
      type="button"
      disabled={deleting}
      onClick={() => {
        setError("");
        setConfirming(true);
      }}
      className={
        compact
          ? "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-100 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          : "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-100 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      <TrashIcon />
      Delete Game
    </button>
  );

  return (
    <>
      {error && <Notification type="error" message={error} onClose={() => setError("")} />}

      {compact ? (
        deleteButton
      ) : (
        <section className="overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-sm">
          <div className="px-6 py-5">
            <h2 className="text-base font-bold text-[#172033]">
              Danger Zone
            </h2>

            <div className="mt-4 flex flex-col gap-4 rounded-xl border border-[#E8ECF4] bg-[#FAFBFD] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#344054]">
                  Delete Game
                </p>

                <p className="mt-1 text-sm leading-5 text-[#667085]">
                  Permanently remove this
                  game and its associated
                  files from LumenTrail.
                </p>
              </div>

              {deleteButton}
            </div>
          </div>
        </section>
      )}

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-game-title"
          onMouseDown={(event) => {
            if (
              !deleting &&
              event.target ===
                event.currentTarget
            ) {
              setConfirming(false);
            }
          }}
        >
          <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-2xl shadow-slate-900/15">
            <div className="px-6 pb-5 pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                  <TrashIconLarge />
                </div>

                <div className="min-w-0 flex-1">
                  <h2
                    id="delete-game-title"
                    className="text-lg font-bold text-[#172033]"
                  >
                    Delete this game?
                  </h2>

                  <p className="mt-1.5 text-sm leading-6 text-[#667085]">
                    You are about to
                    permanently delete{" "}
                    <span className="font-semibold text-[#344054]">
                      {gameName}
                    </span>
                    .
                  </p>
                </div>

                <button
                  type="button"
                  disabled={deleting}
                  onClick={() =>
                    setConfirming(
                      false
                    )
                  }
                  className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition hover:bg-[#F2F4F7] hover:text-[#475467] disabled:opacity-50"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="mt-layout flex items-start gap-3 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] px-4 py-3.5">
                <div className="mt-0.5 text-amber-500">
                  <WarningIcon />
                </div>

                <p className="text-sm leading-5 text-[#667085]">
                  <span className="font-semibold text-[#344054]">
                    This cannot be undone.
                  </span>{" "}
                  The game, its image,
                  SCORM ZIP, and extracted
                  package files will be
                  removed.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-[#E8ECF4] bg-[#FAFBFD] px-6 py-4">
              <button
                type="button"
                disabled={deleting}
                onClick={() =>
                  setConfirming(
                    false
                  )
                }
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#D8DEEA] bg-white px-4 text-sm font-semibold text-[#475467] transition hover:bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#CBD5E1] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              ><ActionIcon name="close" />
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={
                  handleDelete
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Spinner />
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon />
                    Delete Game
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TrashIcon() { return <ActionIcon name="delete" />; }

function TrashIconLarge() {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function WarningIcon() {
  return (
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
      <path d="M12 3 2.8 19h18.4L12 3Z" />
      <path d="M12 9v4" />
      <path d="M12 16.5h.01" />
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
      className="h-4 w-4"
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

function CloseIcon() { return <ActionIcon name="close" />; }

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4 animate-spin"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />

      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}