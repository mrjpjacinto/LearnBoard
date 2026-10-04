"use client";

import { useMemo, useState } from "react";
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

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("all");

  const [
    selectedSchool,
    setSelectedSchool,
  ] = useState<School | null>(
    null
  );

  const [
    editName,
    setEditName,
  ] = useState("");

  const [
    editCode,
    setEditCode,
  ] = useState("");

  const [
    editActive,
    setEditActive,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    editError,
    setEditError,
  ] = useState("");

  const filteredSchools =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return schools.filter(
        (school) => {
          const matchesSearch =
            !query ||
            school.name
              .toLowerCase()
              .includes(query) ||
            (
              school.code || ""
            )
              .toLowerCase()
              .includes(query);

          const matchesStatus =
            status === "all" ||
            (
              status ===
                "active" &&
              school.is_active
            ) ||
            (
              status ===
                "inactive" &&
              !school.is_active
            );

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      schools,
      search,
      status,
    ]);

  function openManage(
    school: School
  ) {
    setSelectedSchool(
      school
    );

    setEditName(
      school.name
    );

    setEditCode(
      school.code || ""
    );

    setEditActive(
      school.is_active
    );

    setEditError("");
  }

  function closeManage() {
    if (saving) {
      return;
    }

    setSelectedSchool(null);
    setEditError("");
  }

  async function saveSchool() {
    if (!selectedSchool) {
      return;
    }

    const cleanName =
      editName.trim();

    const cleanCode =
      editCode.trim();

    if (!cleanName) {
      setEditError(
        "School name is required."
      );

      return;
    }

    setSaving(true);
    setEditError("");

    try {
      const response =
        await fetch(
          `/api/admin/schools/${selectedSchool.id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name: cleanName,
              code:
                cleanCode ||
                null,
              isActive:
                editActive,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setEditError(
          result.error ||
            "Unable to update school."
        );

        return;
      }

      setSelectedSchool(
        null
      );

      router.refresh();
    } catch {
      setEditError(
        "Unable to connect to the server."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-sm">

        {/* Table header */}
        <div className="border-b border-[#E3E8F2] p-6">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <h2 className="font-semibold text-[#172033]">
                All Schools
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {
                  filteredSchools.length
                }{" "}
                school
                {filteredSchools.length ===
                1
                  ? ""
                  : "s"}{" "}
                shown
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">

              <div className="relative">

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                  />

                  <path d="m20 20-3.5-3.5" />
                </svg>

                <input
                  type="search"
                  value={search}
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search schools..."
                  className="w-full min-w-64 rounded-xl border border-[#D8DEEA] bg-white py-2.5 pl-10 pr-4 text-sm text-[#172033] outline-none transition placeholder:text-slate-400 focus:border-[#818CF8]"
                />

              </div>

              <select
                value={status}
                onChange={(
                  event
                ) =>
                  setStatus(
                    event.target
                      .value
                  )
                }
                className="rounded-xl border border-[#D8DEEA] bg-white px-4 py-2.5 text-sm text-[#475467] outline-none transition focus:border-[#818CF8]"
              >
                <option value="all">
                  All Statuses
                </option>

                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>

            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">

          <table className="w-full text-left">

            <thead className="bg-[#F8FAFC] text-xs font-semibold uppercase tracking-wide text-slate-500">

              <tr>
                <th className="px-6 py-4">
                  School
                </th>

                <th className="px-6 py-4">
                  Code
                </th>

                <th className="px-6 py-4">
                  Status
                </th>

                <th className="px-6 py-4">
                  Created
                </th>

                <th className="px-6 py-4 text-right">
                  Actions
                </th>
              </tr>

            </thead>

            <tbody className="divide-y divide-[#EEF1F6]">

              {filteredSchools.map(
                (school) => (
                  <tr
                    key={school.id}
                    className="text-sm transition hover:bg-[#FAFBFD]"
                  >

                    <td className="px-6 py-4">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1]">

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
                            <path d="M3 21h18" />
                            <path d="M5 21V9l7-4 7 4v12" />
                            <path d="M9 21v-6h6v6" />
                          </svg>

                        </div>

                        <div>
                          <p className="font-semibold text-[#172033]">
                            {
                              school.name
                            }
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            School
                          </p>
                        </div>

                      </div>

                    </td>

                    <td className="px-6 py-4">

                      {school.code ? (
                        <span className="inline-flex rounded-lg bg-[#F1F5F9] px-2.5 py-1 font-mono text-xs font-semibold text-slate-600">
                          {
                            school.code
                          }
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          —
                        </span>
                      )}

                    </td>

                    <td className="px-6 py-4">

                      {school.is_active ? (

                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">

                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                          Active

                        </span>

                      ) : (

                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">

                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />

                          Inactive

                        </span>

                      )}

                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      {new Date(
                        school.created_at
                      ).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-right">

                      <button
                        type="button"
                        onClick={() =>
                          openManage(
                            school
                          )
                        }
                        className="rounded-lg border border-[#D8DEEA] bg-white px-3 py-2 text-xs font-semibold text-[#475467] transition hover:border-[#A5B4FC] hover:bg-[#F5F6FF] hover:text-[#4F46E5]"
                      >
                        Manage
                      </button>

                    </td>

                  </tr>
                )
              )}

              {filteredSchools.length ===
                0 && (

                <tr>

                  <td
                    colSpan={5}
                    className="px-6 py-14 text-center"
                  >

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1]">

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
                        <path d="M3 21h18" />
                        <path d="M5 21V9l7-4 7 4v12" />
                        <path d="M9 21v-6h6v6" />
                      </svg>

                    </div>

                    <p className="mt-4 font-semibold text-[#172033]">
                      No schools found
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Try changing your search or status filter.
                    </p>

                  </td>

                </tr>
              )}

            </tbody>
          </table>
        </div>
      </div>

      {/* Manage School Modal */}
      {selectedSchool && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white text-slate-900 shadow-xl">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E3E8F2] px-6 py-5">

              <div>

                <p className="text-xs font-semibold tracking-wide text-[#6366F1]">
                  SCHOOL MANAGEMENT
                </p>

                <h2 className="mt-1 text-xl font-bold text-[#172033]">
                  Manage School
                </h2>

              </div>

              <button
                type="button"
                onClick={
                  closeManage
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

            {/* Modal Body */}
            <div className="space-y-5 p-6">

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  School Name
                </label>

                <input
                  type="text"
                  value={editName}
                  onChange={(
                    event
                  ) =>
                    setEditName(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 text-[#172033] outline-none transition focus:border-[#818CF8]"
                  placeholder="School name"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  School Code
                </label>

                <input
                  type="text"
                  value={editCode}
                  onChange={(
                    event
                  ) =>
                    setEditCode(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 text-[#172033] outline-none transition focus:border-[#818CF8]"
                  placeholder="Optional school code"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Use a short unique code to identify this school.
                </p>

              </div>

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Status
                </label>

                <select
                  value={
                    editActive
                      ? "active"
                      : "inactive"
                  }
                  onChange={(
                    event
                  ) =>
                    setEditActive(
                      event.target
                        .value ===
                        "active"
                    )
                  }
                  className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 text-[#172033] outline-none transition focus:border-[#818CF8]"
                >
                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>
                </select>

                <p className="mt-2 text-xs text-slate-500">
                  Inactive schools remain in LearnBoard but cannot be selected for new assignments.
                </p>

              </div>

              {editError && (

                <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {editError}
                </div>

              )}

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-[#E3E8F2] bg-[#FAFBFD] px-6 py-4">

              <button
                type="button"
                onClick={
                  closeManage
                }
                disabled={saving}
                className="rounded-xl border border-[#D8DEEA] bg-white px-5 py-2.5 text-sm font-semibold text-[#475467] transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  saveSchool
                }
                disabled={saving}
                className="rounded-xl bg-[#6366F1] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

            </div>

          </div>
        </div>
      )}
    </>
  );
}