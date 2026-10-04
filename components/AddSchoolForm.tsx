"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AddSchoolForm() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function closeModal() {
    if (loading) {
      return;
    }

    setOpen(false);
    setName("");
    setCode("");
    setError("");
    setSuccess("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/schools",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            code,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "The school could not be created."
        );

        setLoading(false);
        return;
      }

      setSuccess("School created successfully.");
      setName("");
      setCode("");

      router.refresh();

      setTimeout(() => {
        setOpen(false);
        setSuccess("");
      }, 700);
    } catch {
      setError(
        "Something went wrong while creating the school."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError("");
          setSuccess("");
        }}
        className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Add School
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">

            <div className="flex items-start justify-between border-b border-slate-200 p-6">

              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Add School
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create a new school in LearnBoard.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                Close
              </button>

            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >

              <div>
                <label
                  htmlFor="school-name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  School Name
                </label>

                <input
                  id="school-name"
                  type="text"
                  required
                  maxLength={150}
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Example Academy"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="school-code"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  School Code
                </label>

                <input
                  id="school-code"
                  type="text"
                  maxLength={50}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value)
                  }
                  placeholder="Optional, e.g. EXA"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Optional. The code must be unique if
                  provided.
                </p>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Creating..."
                    : "Create School"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}
    </>
  );
}