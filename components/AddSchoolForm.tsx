"use client";

import {
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import PrimaryAddButton from "@/components/PrimaryAddButton";

export default function AddSchoolForm() {
  const router = useRouter();

  const [open, setOpen] =
    useState(false);

  const [name, setName] =
    useState("");

  const [code, setCode] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  function closeModal() {
    if (saving) {
      return;
    }

    setOpen(false);
    setName("");
    setCode("");
    setError("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanName =
      name.trim();

    const cleanCode =
      code.trim();

    if (!cleanName) {
      setError(
        "School name is required."
      );

      return;
    }

    setSaving(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/schools",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name: cleanName,
              code:
                cleanCode ||
                null,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Unable to create school."
        );

        return;
      }

      setName("");
      setCode("");
      setOpen(false);

      router.refresh();
    } catch {
      setError(
        "Unable to connect to the server."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PrimaryAddButton
        onClick={() =>
          setOpen(true)
        }
      >
        Add School
      </PrimaryAddButton>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white text-slate-900 shadow-xl">

            <div className="flex items-center justify-between border-b border-[#E3E8F2] px-6 py-5">

              <div>
                <p className="text-xs font-semibold tracking-wide text-[#6366F1]">
                  SCHOOL MANAGEMENT
                </p>

                <h2 className="mt-1 text-xl font-bold text-[#172033]">
                  Add School
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create a new school in LearnBoard.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={saving}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
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
            >

              <div className="space-y-5 p-6">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    School Name
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(
                      event
                    ) =>
                      setName(
                        event.target
                          .value
                      )
                    }
                    placeholder="Enter school name"
                    autoFocus
                    className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 text-[#172033] outline-none transition placeholder:text-slate-400 focus:border-[#818CF8]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    School Code
                  </label>

                  <input
                    type="text"
                    value={code}
                    onChange={(
                      event
                    ) =>
                      setCode(
                        event.target
                          .value
                      )
                    }
                    placeholder="Optional school code"
                    className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 text-[#172033] outline-none transition placeholder:text-slate-400 focus:border-[#818CF8]"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Use a short unique code to identify the school.
                  </p>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

              </div>

              <div className="flex justify-end gap-3 border-t border-[#E3E8F2] bg-[#FAFBFD] px-6 py-4">

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                  className="rounded-xl border border-[#D8DEEA] bg-white px-5 py-2.5 text-sm font-semibold text-[#475467] transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {!saving && (
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
                  )}

                  {saving
                    ? "Adding..."
                    : "Add School"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}
    </>
  );
}