"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type School = {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
  created_at: string;
};

type SchoolsTableProps = {
  schools: School[];
};

export default function SchoolsTable({
  schools,
}: SchoolsTableProps) {
  const router = useRouter();

  const [selectedSchool, setSelectedSchool] =
    useState<School | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function openManage(school: School) {
    setSelectedSchool(school);
    setName(school.name);
    setCode(school.code || "");
    setIsActive(school.is_active);
    setError("");
    setSuccess("");
  }

  function closeManage() {
    if (loading) {
      return;
    }

    setSelectedSchool(null);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedSchool) {
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/schools/${selectedSchool.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            code,
            is_active: isActive,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "The school could not be updated."
        );
        return;
      }

      setSuccess("School updated successfully.");

      router.refresh();

      setTimeout(() => {
        setSelectedSchool(null);
        setSuccess("");
      }, 700);
    } catch {
      setError(
        "Something went wrong while updating the school."
      );
    } finally {
      setLoading(false);
    }
  }

  if (schools.length === 0) {
    return (
      <div className="px-7 py-16 text-center">
        <h3 className="text-lg font-semibold text-slate-900">
          No schools yet
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Select Add School to create your first school.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">

        <table className="w-full text-left">

          <thead className="bg-slate-50 text-sm text-slate-500">
            <tr>
              <th className="px-7 py-4 font-semibold">
                School
              </th>

              <th className="px-7 py-4 font-semibold">
                Code
              </th>

              <th className="px-7 py-4 font-semibold">
                Status
              </th>

              <th className="px-7 py-4 font-semibold">
                Created
              </th>

              <th className="px-7 py-4 text-right font-semibold">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">

            {schools.map((school) => (
              <tr key={school.id}>

                <td className="px-7 py-5">
                  <p className="font-semibold text-slate-900">
                    {school.name}
                  </p>
                </td>

                <td className="px-7 py-5 text-sm text-slate-600">
                  {school.code || "—"}
                </td>

                <td className="px-7 py-5">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      school.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {school.is_active
                      ? "Active"
                      : "Inactive"}
                  </span>
                </td>

                <td className="px-7 py-5 text-sm text-slate-600">
                  {new Date(
                    school.created_at
                  ).toLocaleDateString()}
                </td>

                <td className="px-7 py-5 text-right">
                  <button
                    type="button"
                    onClick={() => openManage(school)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Manage
                  </button>
                </td>

              </tr>
            ))}

          </tbody>
        </table>

      </div>

      {selectedSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">

            <div className="flex items-start justify-between border-b border-slate-200 p-6">

              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Manage School
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Edit school information and status.
                </p>
              </div>

              <button
                type="button"
                onClick={closeManage}
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
                  htmlFor="manage-school-name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  School Name
                </label>

                <input
                  id="manage-school-name"
                  type="text"
                  required
                  maxLength={150}
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="manage-school-code"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  School Code
                </label>

                <input
                  id="manage-school-code"
                  type="text"
                  maxLength={50}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value)
                  }
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                />
              </div>

              <div>
                <p className="mb-2 block text-sm font-semibold text-slate-700">
                  Status
                </p>

                <div className="grid grid-cols-2 gap-3">

                  <button
                    type="button"
                    onClick={() => setIsActive(true)}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      isActive
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Active
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsActive(false)}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      !isActive
                        ? "border-slate-700 bg-slate-100 text-slate-900"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Inactive
                  </button>

                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Inactive schools remain in LearnBoard so
                  historical learning records can be preserved.
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
                  onClick={closeManage}
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
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}
    </>
  );
}