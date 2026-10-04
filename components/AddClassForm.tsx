"use client";

import {
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import PrimaryAddButton from "@/components/PrimaryAddButton";

type School = {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
};

type Props = {
  isSuperAdmin: boolean;
  schools: School[];
};

export default function AddClassForm({
  isSuperAdmin,
  schools,
}: Props) {
  const router = useRouter();

  const activeSchools =
    schools.filter(
      (school) =>
        school.is_active
    );

  const [open, setOpen] =
    useState(false);

  const [name, setName] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [schoolId, setSchoolId] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/classes",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name,
            description,
            schoolId:
              isSuperAdmin
                ? schoolId
                : null,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to create class."
        );
      }

      setName("");
      setDescription("");
      setSchoolId("");
      setOpen(false);

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create class."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PrimaryAddButton
        onClick={() =>
          setOpen(true)
        }
      >
        Add Class
      </PrimaryAddButton>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">

          <div className="w-full max-w-lg rounded-2xl border border-[#E3E8F2] bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-[#E8ECF4] px-6 py-5">

              <div>
                <p className="text-xs font-semibold tracking-wide text-[#6366F1]">
                  CLASS MANAGEMENT
                </p>

                <h2 className="mt-1 text-xl font-bold text-[#172033]">
                  Add Class
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create a class for students.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                aria-label="Close"
                disabled={loading}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
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
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>

            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-5 p-6"
            >

              {isSuperAdmin && (
                <div>

                  <label className="mb-2 block text-sm font-semibold text-[#344054]">
                    School
                  </label>

                  <select
                    value={
                      schoolId
                    }
                    onChange={(e) =>
                      setSchoolId(
                        e.target
                          .value
                      )
                    }
                    required
                    className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 text-sm text-[#172033] outline-none transition focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10"
                  >
                    <option value="">
                      Select a school
                    </option>

                    {activeSchools.map(
                      (school) => (
                        <option
                          key={
                            school.id
                          }
                          value={
                            school.id
                          }
                        >
                          {
                            school.name
                          }
                          {school.code
                            ? ` (${school.code})`
                            : ""}
                        </option>
                      )
                    )}
                  </select>

                </div>
              )}

              <div>

                <label className="mb-2 block text-sm font-semibold text-[#344054]">
                  Class Name
                </label>

                <input
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  required
                  maxLength={150}
                  placeholder="Example: Grade 5 - A"
                  className="w-full rounded-xl border border-[#D8DEEA] px-4 py-3 text-sm text-[#172033] outline-none transition placeholder:text-slate-400 focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-semibold text-[#344054]">
                  Description
                </label>

                <textarea
                  value={
                    description
                  }
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                  maxLength={500}
                  rows={4}
                  placeholder="Optional class description"
                  className="w-full resize-none rounded-xl border border-[#D8DEEA] px-4 py-3 text-sm text-[#172033] outline-none transition placeholder:text-slate-400 focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10"
                />

              </div>

              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-[#E3E8F2] pt-5">

                <button
                  type="button"
                  onClick={() =>
                    setOpen(false)
                  }
                  disabled={loading}
                  className="rounded-xl border border-[#D8DEEA] bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    (isSuperAdmin &&
                      !schoolId)
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {!loading && (
                    <PlusIcon />
                  )}

                  {loading
                    ? "Creating..."
                    : "Add Class"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}
    </>
  );
}

function PlusIcon() {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}