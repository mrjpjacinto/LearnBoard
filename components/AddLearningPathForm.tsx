"use client";
import { Notification } from "./LmsToast";
import ActionIcon from "@/components/ActionIcon";
import { addButtonClass } from "@/lib/ui/buttons";


import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type School = {
  id: string;
  name: string;
};

type AddLearningPathFormProps = {
  isSuperAdmin: boolean;
  schools: School[];
  schoolId: string | null;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

export default function AddLearningPathForm({
  isSuperAdmin,
  schools,
  schoolId,
}: AddLearningPathFormProps) {
  const router = useRouter();

  const nameRef =
    useRef<HTMLInputElement>(null);

  const schoolRef =
    useRef<HTMLSelectElement>(null);

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [status, setStatus] =
    useState<"active" | "archived">(
      "active"
    );

  const [selectedSchoolId, setSelectedSchoolId] =
    useState(
      isSuperAdmin
        ? ""
        : schoolId || ""
    );

  const [errors, setErrors] =
    useState<{
      name?: string;
      school?: string;
      general?: string;
    }>({});

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [toast, setToast] =
    useState<ToastState>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(
      () => {
        setToast(null);
      },
      toast.type === "success"
        ? 3000
        : 5000
    );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [toast]);

  function validate() {
    const nextErrors: {
      name?: string;
      school?: string;
    } = {};

    if (!name.trim()) {
      nextErrors.name =
        "Learning Path name is required.";
    }

    if (
      isSuperAdmin &&
      !selectedSchoolId
    ) {
      nextErrors.school =
        "Please select a school.";
    }

    setErrors(nextErrors);

    if (nextErrors.name) {
      nameRef.current?.focus();
      nameRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      return false;
    }

    if (nextErrors.school) {
      schoolRef.current?.focus();
      schoolRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

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

    setIsSubmitting(true);
    setErrors({});
    setToast(null);

    let created = false;
    try {
      const response = await fetch(
        "/api/admin/paths",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            description:
              description.trim() || null,
            status,
            school_id:
              selectedSchoolId || null,
          }),
        }
      );

      const result =
        await response.json().catch(
          () => null
        );

      if (!response.ok) {
        const message =
          result?.error ||
          "Unable to create the Learning Path.";

        setErrors({
          general: message,
        });

        setToast({
          type: "error",
          message,
        });

        return;
      }

      const pathId =
        result?.path?.id;

      created = true;

      setToast({
        type: "success",
        message:
          "Learning Path created successfully.",
      });

      if (pathId) {
        router.push(
          `/admin/paths/${pathId}`
        );
        return;
      }

      router.push("/admin/paths");
    } catch (error) {
      console.error(
        "Create Learning Path error:",
        error
      );

      const message =
        "Something went wrong while creating the Learning Path.";

      setErrors({
        general: message,
      });

      setToast({
        type: "error",
        message,
      });
    } finally {
      if (!created) setIsSubmitting(false);
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
            Start with the basic
            Learning Path information.
            Games can be added and
            ordered after the path is
            created.
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
                  Unable to create
                  Learning Path
                </p>

                <p className="mt-1 text-sm leading-5 text-red-700">
                  {errors.general}
                </p>
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
              disabled={isSubmitting}
              onChange={(event) => {
                setName(
                  event.target.value
                );

                if (errors.name) {
                  setErrors(
                    (current) => ({
                      ...current,
                      name: undefined,
                    })
                  );
                }
              }}
              placeholder="e.g. Multiplication Foundations"
              className={`mt-2 h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-[#172033] outline-none transition placeholder:text-[#98A2B3] disabled:cursor-not-allowed disabled:bg-[#F8FAFC] ${
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
              disabled={isSubmitting}
              onChange={(event) =>
                setDescription(
                  event.target.value
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
                {description.length}/1000
              </span>
            </div>
          </div>

          {isSuperAdmin && (
            <div>
              <label
                htmlFor="path-school"
                className="block text-sm font-semibold text-[#344054]"
              >
                School
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                ref={schoolRef}
                id="path-school"
                value={selectedSchoolId}
                disabled={isSubmitting}
                onChange={(event) => {
                  setSelectedSchoolId(
                    event.target.value
                  );

                  if (errors.school) {
                    setErrors(
                      (current) => ({
                        ...current,
                        school:
                          undefined,
                      })
                    );
                  }
                }}
                className={`mt-2 h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-[#172033] outline-none transition disabled:cursor-not-allowed disabled:bg-[#F8FAFC] ${
                  errors.school
                    ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50"
                    : "border-[#D8DEEA] focus:border-[#818CF8] focus:ring-4 focus:ring-[#EEF0FF]"
                }`}
              >
                <option value="">
                  Select a school
                </option>

                {schools.map(
                  (school) => (
                    <option
                      key={school.id}
                      value={school.id}
                    >
                      {school.name}
                    </option>
                  )
                )}
              </select>

              {errors.school ? (
                <p className="mt-1.5 text-xs font-medium text-red-600">
                  {errors.school}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-[#98A2B3]">
                  The Learning Path
                  will belong to this
                  school.
                </p>
              )}
            </div>
          )}

          {!isSuperAdmin && (
            <div className="rounded-xl border border-[#E3E8F2] bg-[#F8FAFC] px-4 py-3.5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 text-[#6366F1]">
                  <SchoolIcon />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#344054]">
                    Your School
                  </p>

                  <p className="mt-1 text-sm leading-5 text-[#667085]">
                    This Learning Path
                    will automatically
                    belong to your
                    school.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <span className="block text-sm font-semibold text-[#344054]">
              Status
            </span>

            <p className="mt-1 text-xs leading-5 text-[#98A2B3]">
              Active paths are available for learning.
              Archived paths remain saved but inactive.
            </p>

            <div className="mt-3 grid gap-layout sm:grid-cols-2">
              <StatusOption
                selected={
                  status === "active"
                }
                title="Active"
                description="Ready to build and use."
                icon={
                  <CheckCircleIcon />
                }
                disabled={isSubmitting}
                onClick={() =>
                  setStatus("active")
                }
              />

              <StatusOption
                selected={
                  status ===
                  "archived"
                }
                title="Archived"
                description="Keep it saved but inactive."
                icon={<ArchiveIcon />}
                disabled={isSubmitting}
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
            href="/admin/paths"
            className={`inline-flex h-11 items-center justify-center rounded-xl border border-[#D8DEEA] bg-white px-4 text-sm font-semibold text-[#475467] transition hover:bg-[#F8FAFC] ${
              isSubmitting
                ? "pointer-events-none opacity-50"
                : ""
            }`}
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className={addButtonClass}
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon />
                Creating...
              </>
            ) : (
              <>
                <PlusIcon />
                Create Learning Path
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
          : "border-[#D8DEEA] bg-white hover:border-[#C7CCF8] hover:bg-[#FBFBFF]"
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

function PlusIcon() { return <ActionIcon name="add" />; }

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
