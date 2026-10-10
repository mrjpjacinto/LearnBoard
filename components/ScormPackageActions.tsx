"use client";
import { Notification } from "./LmsToast";
import ActionIcon from "@/components/ActionIcon";


import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type ScormPackageActionsProps = {
  gameId: string;
};

const MAX_SCORM_SIZE =
  150 * 1024 * 1024;

export default function ScormPackageActions({
  gameId,
}: ScormPackageActionsProps) {
  const router = useRouter();

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    confirmingRemove,
    setConfirmingRemove,
  ] = useState(false);

  const [
    removing,
    setRemoving,
  ] = useState(false);

  const [
    replacing,
    setReplacing,
  ] = useState(false);

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        setSuccess("");
      }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [success]);

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

  function openFilePicker() {
    if (replacing || removing) {
      return;
    }

    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";

      fileInputRef.current.click();
    }
  }

  async function handleReplaceFile(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");

    if (
      !file.name
        .toLowerCase()
        .endsWith(".zip")
    ) {
      setError(
        "SCORM package must be a ZIP file."
      );

      event.target.value = "";
      return;
    }

    if (file.size === 0) {
      setError(
        "The selected ZIP file is empty."
      );

      event.target.value = "";
      return;
    }

    if (
      file.size >
      MAX_SCORM_SIZE
    ) {
      setError(
        "SCORM package cannot exceed 150 MB."
      );

      event.target.value = "";
      return;
    }

    setReplacing(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          `/api/admin/games/${gameId}/scorm/replace`,
          {
            method: "POST",
            body: formData,
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
            `Unable to replace the SCORM package. The server returned an unexpected response (${response.status}).`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to replace the SCORM package."
        );
      }

      setSuccess(
        "SCORM package replaced successfully."
      );

      event.target.value = "";

      router.refresh();
    } catch (replaceError) {
      setError(
        replaceError instanceof Error
          ? replaceError.message
          : "Unable to replace the SCORM package."
      );

      event.target.value = "";
    } finally {
      setReplacing(false);
    }
  }

  async function handleRemove() {
    if (removing) {
      return;
    }

    setRemoving(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          `/api/admin/games/${gameId}/scorm/remove`,
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
            `Unable to remove the SCORM package. The server returned an unexpected response (${response.status}).`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to remove the SCORM package."
        );
      }

      setConfirmingRemove(false);

      setSuccess(
        "SCORM package removed successfully."
      );

      router.refresh();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove the SCORM package."
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip"
        onChange={
          handleReplaceFile
        }
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {error ? <Notification type="error" message={error} onClose={() => setError("")} /> : success ? <Notification type="success" message={success} onClose={() => setSuccess("")} /> : null}

      <div className="grid gap-2.5">
        <a
          href={`/api/admin/games/${gameId}/scorm/download`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2"
        >
          <DownloadIcon />
          Download ZIP
        </a>

        <button
          type="button"
          disabled={
            replacing ||
            removing
          }
          onClick={
            openFilePicker
          }
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#C7D2FE] bg-[#EEF0FF] px-4 text-sm font-semibold text-[#4F46E5] transition hover:border-[#A5B4FC] hover:bg-[#E4E7FF] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {replacing ? (
            <>
              <Spinner />
              Replacing...
            </>
          ) : (
            <>
              <ReplaceIcon />
              Replace ZIP
            </>
          )}
        </button>

        <button
          type="button"
          disabled={
            replacing ||
            removing
          }
          onClick={() => {
            setError("");
            setSuccess("");

            setConfirmingRemove(
              true
            );
          }}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:border-red-400 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <TrashIcon />
          Remove ZIP
        </button>
      </div>

      {confirmingRemove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-scorm-title"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setConfirmingRemove(
                false
              );
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
                    id="remove-scorm-title"
                    className="text-lg font-bold text-[#172033]"
                  >
                    Remove SCORM package?
                  </h2>

                  <p className="mt-1.5 text-sm leading-6 text-[#667085]">
                    The ZIP package and its
                    extracted SCORM files
                    will be permanently
                    removed from this game.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={removing}
                  onClick={() =>
                    setConfirmingRemove(
                      false
                    )
                  }
                  className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition hover:bg-[#F2F4F7] hover:text-[#4F46E5] disabled:opacity-50 !border-red-200 !bg-red-50 !text-red-700 hover:!bg-red-100 focus-visible:!outline-red-500 focus:!ring-red-200"
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
                  Your game, title,
                  description, subject,
                  and image
                  will remain unchanged.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-[#E8ECF4] bg-[#FAFBFD] px-6 py-4">
              <button
                type="button"
                disabled={removing}
                onClick={() => {
                  setConfirmingRemove(
                    false
                  );
                }}
                className="inline-flex items-center gap-2 inline-flex h-10 items-center justify-center rounded-xl border border-[#D8DEEA] bg-[#EEF0FF] px-4 text-sm font-semibold text-[#4F46E5] transition hover:bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#CBD5E1] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 !border-red-200 !bg-red-50 !text-red-700 hover:!bg-red-100 focus-visible:!outline-red-500 focus:!ring-red-200"
              ><ActionIcon name="close" />
                Cancel
              </button>

              <button
                type="button"
                disabled={removing}
                onClick={
                  handleRemove
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {removing ? (
                  <>
                    <Spinner />
                    Removing...
                  </>
                ) : (
                  <>
                    <TrashIcon />
                    Remove Package
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

function DownloadIcon() { return <ActionIcon name="download" />; }

function ReplaceIcon() {
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
      <path d="M20 7h-9" />
      <path d="m17 4 3 3-3 3" />
      <path d="M4 17h9" />
      <path d="m7 14-3 3 3 3" />
    </svg>
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

function CheckIcon() {
  return (
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