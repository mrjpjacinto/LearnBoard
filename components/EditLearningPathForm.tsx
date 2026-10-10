"use client";
import { showToast } from "./LmsToast";
import { Notification } from "./LmsToast";
import ActionIcon from "@/components/ActionIcon";


import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type LearningPath = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
};

type EditLearningPathFormProps = {
  path: LearningPath;
  schoolName: string | null;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

export default function EditLearningPathForm({
  path,
  schoolName,
}: EditLearningPathFormProps) {
  const router = useRouter();

  const nameRef =
    useRef<HTMLInputElement>(null);

  const [name, setName] =
    useState(path.name);

  const [
    description,
    setDescription,
  ] = useState(
    path.description || ""
  );

  const [status, setStatus] =
    useState<
      "active" | "archived"
    >(path.status);

  const [errors, setErrors] =
    useState<{
      name?: string;
      general?: string;
    }>({});

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [toast, setToast] =
    useState<ToastState>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => {
          setToast(null);
        },
        toast.type ===
          "success"
          ? 3000
          : 5000
      );

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [toast]);

  function validate() {
    const nextErrors: {
      name?: string;
    } = {};

    if (!name.trim()) {
      nextErrors.name =
        "Learning Path name is required.";
    }

    if (
      name.trim().length > 150
    ) {
      nextErrors.name =
        "Learning Path name must be 150 characters or fewer.";
    }

    setErrors(nextErrors);

    if (nextErrors.name) {
      nameRef.current?.focus();

      nameRef.current?.scrollIntoView(
        {
          behavior: "smooth",
          block: "center",
        }
      );

      return false;
    }

    return true;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!validate()) {
      return;
    }

    if (
      description.trim().length >
      1000
    ) {
      const message =
        "Description must be 1,000 characters or fewer.";

      setErrors({
        general: message,
      });

      setToast({
        type: "error",
        message,
      });

      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setToast(null);

    let saved = false;
    try {
      const response =
        await fetch(
          `/api/admin/paths/${path.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              name: name.trim(),
              description:
                description.trim() ||
                null,
              status,
            }),
          }
        );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        const message =
          result?.error ||
          "Unable to save the Learning Path.";

        setErrors({
          general: message,
        });

        setToast({
          type: "error",
          message,
        });

        return;
      }

      showToast({ type: "success", message: "Learning Path updated successfully." });

      saved = true;
      router.push(`/admin/paths/${path.id}`);
    } catch (error) {
      console.error(
        "Update Learning Path error:",
        error
      );

      const message =
        "Something went wrong while saving the Learning Path.";

      setErrors({
        general: message,
      });

      setToast({
        type: "error",
        message,
      });
    } finally {
      if (!saved) setIsSubmitting(false);
    }
  }

  return (
    <>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() =>
            setToast(null)
          }
        />
      )}

      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-sm"
      >
        <div className="border-b border-[#E8ECF4] px-6 py-5 sm:px-7">
          <h2 className="text-lg font-bold text-[#172033]">
            Path Details
          </h2>

          <p className="mt-1 text-sm leading-6 text-[#667085]">
            Update the information
            teachers and administrators
            see for this Learning Path.
          </p>
        </div>

        <div className="stack-layout px-6 py-6 sm:px-7">
          {errors.general && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5"
            >
              <div className="mt-0.5 shrink-0 text-red-600">
                <ErrorIcon />
              </div>

              <div>
                <p className="text-sm font-semibold text-red-800">
                  Unable to save
                  Learning Path
                </p>

                <p className="mt-1 text-sm leading-5 text-red-700">
                  {errors.general}
                </p>
              </div>
            </div>
          )}

          {schoolName && (
            <div className="rounded-xl border border-[#E3E8F2] bg-[#F8FAFC] px-4 py-3.5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 text-[#6366F1]">
                  <SchoolIcon />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[#98A2B3]">
                    School
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[#344054]">
                    {schoolName}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="path-name"
              className="block text-sm font-semibold text-[#344054]"
            >
              Learning Path Name
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <input
              ref={nameRef}
              id="path-name"
              type="text"
              value={name}
              maxLength={150}
              disabled={
                isSubmitting
              }
              onChange={(
                event
              ) => {
                setName(
                  event.target
                    .value
                );

                if (
                  errors.name
                ) {
                  setErrors(
                    (current) => ({
                      ...current,
                      name: undefined,
                    })
                  );
                }
              }}
              className={`mt-2 h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-[#172033] outline-none transition disabled:cursor-not-allowed disabled:bg-[#F8FAFC] ${
                errors.name
                  ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50"
                  : "border-[#D8DEEA] focus:border-[#818CF8] focus:ring-4 focus:ring-[#EEF0FF]"
              }`}
            />

            <div className="mt-1.5 flex items-start justify-between gap-4">
              <div>
                {errors.name ? (
                  <p className="text-xs font-medium text-red-600">
                    {errors.name}
                  </p>
                ) : (
                  <p className="text-xs text-[#98A2B3]">
                    Use a clear name
                    teachers can easily
                    identify.
                  </p>
                )}
              </div>

              <span className="shrink-0 text-xs text-[#98A2B3]">
                {name.length}/150
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="path-description"
              className="block text-sm font-semibold text-[#344054]"
            >
              Description
            </label>

            <textarea
              id="path-description"
              value={description}
              maxLength={1000}
              rows={5}
              disabled={
                isSubmitting
              }
              onChange={(
                event
              ) =>
                setDescription(
                  event.target
                    .value
                )
              }
              placeholder="Describe the goal of this Learning Path..."
              className="mt-2 w-full resize-y rounded-xl border border-[#D8DEEA] bg-white px-3.5 py-3 text-sm leading-6 text-[#172033] outline-none transition placeholder:text-[#98A2B3] focus:border-[#818CF8] focus:ring-4 focus:ring-[#EEF0FF] disabled:cursor-not-allowed disabled:bg-[#F8FAFC]"
            />

            <div className="mt-1.5 flex items-center justify-between gap-4">
              <p className="text-xs text-[#98A2B3]">
                Optional. Explain what
                students will learn or
                practice.
              </p>

              <span className="shrink-0 text-xs text-[#98A2B3]">
                {
                  description.length
                }
                /1000
              </span>
            </div>
          </div>

          <div>
            <span className="block text-sm font-semibold text-[#344054]">
              Status
            </span>

            <p className="mt-1 text-xs leading-5 text-[#98A2B3]">
              Active paths can be
              assigned. Archived paths
              remain saved but should
              no longer be assigned.
            </p>

            <div className="mt-3 grid gap-layout sm:grid-cols-2">
              <StatusOption
                selected={
                  status ===
                  "active"
                }
                title="Active"
                description="Ready to build and assign."
                icon={
                  <CheckCircleIcon />
                }
                disabled={
                  isSubmitting
                }
                onClick={() =>
                  setStatus(
                    "active"
                  )
                }
              />

              <StatusOption
                selected={
                  status ===
                  "archived"
                }
                title="Archived"
                description="Keep it saved but inactive."
                icon={
                  <ArchiveIcon />
                }
                disabled={
                  isSubmitting
                }
                onClick={() =>
                  setStatus(
                    "archived"
                  )
                }
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#E8ECF4] bg-[#FBFCFE] px-6 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
          <Link
            href={`/admin/paths/${path.id}`}
            className={("inline-flex items-center gap-2 " + ((`inline-flex h-11 items-center justify-center rounded-xl border border-[#D8DEEA] bg-[#EEF0FF] px-4 text-sm font-semibold text-[#4F46E5] transition hover:bg-[#F8FAFC] ${
              isSubmitting
                ? "pointer-events-none opacity-50"
                : ""
            }`) + " !border-red-200 !bg-red-50 !text-red-700 hover:!bg-red-100 focus-visible:!outline-red-500 focus:!ring-red-200"))}
          ><ActionIcon name="close" className="inline-block h-4 w-4 shrink-0 align-middle mr-2" />
            Cancel
          </Link>

          <button
            type="submit"
            disabled={
              isSubmitting
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#818CF8] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon />
                Saving...
              </>
            ) : (
              <>
                <SaveIcon />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}

function StatusOption({
  selected,
  title,
  description,
  icon,
  disabled,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
        selected
          ? "border-[#818CF8] bg-[#F5F5FF] ring-2 ring-[#EEF0FF]"
          : "border-[#D8DEEA] bg-[#EEF0FF] hover:border-[#C7CCF8] hover:bg-[#FBFBFF]"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          selected
            ? "bg-[#E7E9FF] text-[#6366F1]"
            : "bg-[#F4F6FA] text-[#667085]"
        }`}
      >
        {icon}
      </span>

      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#344054]">
            {title}
          </span>

          {selected && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#6366F1] text-white">
              <MiniCheckIcon />
            </span>
          )}
        </span>

        <span className="mt-1 block text-xs leading-5 text-[#667085]">
          {description}
        </span>
      </span>
    </button>
  );
}

function Toast({
  type,
  message,
  onClose,
}: {
  type: "success" | "error";
  message: string;
  onClose: () => void;
}) {
  return <Notification type={type} message={message} onClose={onClose} />;
}

function SchoolIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
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

function CheckCircleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
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
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M5 7v12h14V7" />
      <path d="M3 4h18v3H3z" />
      <path d="M9 11h6" />
    </svg>
  );
}

function SaveIcon() { return <ActionIcon name="save" />; }

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

function CloseIcon() { return <ActionIcon name="close" />; }

function MiniCheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-2.5 w-2.5"
      aria-hidden="true"
    >
      <path d="m6 12 4 4 8-8" />
    </svg>
  );
}

function SpinnerIcon() {
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
        className="opacity-90"
      />
    </svg>
  );
}
