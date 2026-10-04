"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type ClassRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  school_id: string | null;
  created_at: string;
};

type Student = {
  id: string;
  full_name: string | null;
  email: string;
  school_id: string | null;
  is_active: boolean;
};

type Membership = {
  group_id: string;
  user_id: string;
};

type School = {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
};

type Props = {
  classes: ClassRow[];
  students: Student[];
  memberships: Membership[];
  schools: School[];
};

export default function ClassesTable({
  classes,
  students,
  memberships,
  schools,
}: Props) {
  const router = useRouter();

  const [
    selectedClass,
    setSelectedClass,
  ] =
    useState<ClassRow | null>(
      null
    );

  const [name, setName] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    isActive,
    setIsActive,
  ] = useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    busyStudent,
    setBusyStudent,
  ] =
    useState<string | null>(
      null
    );

  const [error, setError] =
    useState("");

  const [
    localMemberships,
    setLocalMemberships,
  ] =
    useState<Membership[]>(
      memberships
    );

  useEffect(() => {
    setLocalMemberships(
      memberships
    );
  }, [memberships]);

  const schoolMap =
    useMemo(
      () =>
        new Map(
          schools.map(
            (school) => [
              school.id,
              school,
            ]
          )
        ),
      [schools]
    );

  function openClass(
    item: ClassRow
  ) {
    setSelectedClass(item);
    setName(item.name);
    setDescription(
      item.description ?? ""
    );
    setIsActive(
      item.is_active
    );
    setError("");
  }

  function closeClass() {
    setSelectedClass(null);
    setError("");
  }

  function membersForClass(
    classId: string
  ) {
    return localMemberships.filter(
      (membership) =>
        membership.group_id ===
        classId
    );
  }

  async function saveClass() {
    if (!selectedClass) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/classes/${selectedClass.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name,
            description,
            isActive,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to update class."
        );
      }

      router.refresh();
      closeClass();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update class."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStudent(
    student: Student
  ) {
    if (!selectedClass) {
      return;
    }

    const existing =
      localMemberships.some(
        (membership) =>
          membership.group_id ===
            selectedClass.id &&
          membership.user_id ===
            student.id
      );

    if (
      !existing &&
      !student.is_active
    ) {
      return;
    }

    setBusyStudent(student.id);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/classes/${selectedClass.id}/members`,
        {
          method: existing
            ? "DELETE"
            : "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            studentId:
              student.id,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to update class membership."
        );
      }

      setLocalMemberships(
        (current) =>
          existing
            ? current.filter(
                (membership) =>
                  !(
                    membership.group_id ===
                      selectedClass.id &&
                    membership.user_id ===
                      student.id
                  )
              )
            : [
                ...current,
                {
                  group_id:
                    selectedClass.id,
                  user_id:
                    student.id,
                },
              ]
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update class membership."
      );
    } finally {
      setBusyStudent(null);
    }
  }

  if (classes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF2FF] text-xl font-bold text-[#6366F1]">
          C
        </div>

        <h2 className="mt-4 text-lg font-bold text-[#172033]">
          No classes yet
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Create your first class to begin organizing students.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-sm">

        <div className="overflow-x-auto">
          <table className="w-full text-left">

            <thead className="border-b border-[#E8ECF4] bg-[#F8FAFD]">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-4">
                  Class
                </th>

                <th className="px-6 py-4">
                  School
                </th>

                <th className="px-6 py-4">
                  Students
                </th>

                <th className="px-6 py-4">
                  Status
                </th>

                <th className="px-6 py-4">
                  Created
                </th>

                <th className="px-6 py-4 text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EDF0F5]">

              {classes.map(
                (item) => {
                  const school =
                    item.school_id
                      ? schoolMap.get(
                          item.school_id
                        )
                      : null;

                  const memberTotal =
                    membersForClass(
                      item.id
                    ).length;

                  return (
                    <tr
                      key={item.id}
                      className="transition hover:bg-[#FAFBFD]"
                    >
                      <td className="px-6 py-5">
                        <p className="font-semibold text-[#172033]">
                          {item.name}
                        </p>

                        <p className="mt-1 max-w-xs truncate text-sm text-slate-500">
                          {item.description ||
                            "No description"}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-sm font-medium text-[#344054]">
                          {school?.name ||
                            "Unknown school"}
                        </p>

                        {school?.code && (
                          <p className="mt-1 text-xs text-slate-400">
                            {
                              school.code
                            }
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <span className="inline-flex rounded-lg bg-[#EEF2FF] px-3 py-1 text-sm font-semibold text-[#4F46E5]">
                          {memberTotal}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            item.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {item.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-500">
                        {new Date(
                          item.created_at
                        ).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            openClass(
                              item
                            )
                          }
                          className="rounded-lg border border-[#D8DEEA] bg-white px-4 py-2 text-sm font-semibold text-[#475467] transition hover:border-[#A5B4FC] hover:bg-[#F5F6FF] hover:text-[#4F46E5]"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}

            </tbody>
          </table>
        </div>
      </div>

      {selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">

          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-[#E8ECF4] px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-[#172033]">
                  Manage Class
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Edit class details and student membership.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeClass
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(90vh-82px)] overflow-y-auto p-6">

              {error && (
                <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#344054]">
                    Class name
                  </label>

                  <input
                    value={name}
                    onChange={(e) =>
                      setName(
                        e.target
                          .value
                      )
                    }
                    maxLength={150}
                    className="w-full rounded-xl border border-[#D8DEEA] px-4 py-3 text-sm outline-none transition focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#344054]">
                    Status
                  </label>

                  <select
                    value={
                      isActive
                        ? "active"
                        : "inactive"
                    }
                    onChange={(e) =>
                      setIsActive(
                        e.target
                          .value ===
                          "active"
                      )
                    }
                    className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10"
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>
                  </select>
                </div>

              </div>

              <div className="mt-5">
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
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[#D8DEEA] px-4 py-3 text-sm outline-none transition focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10"
                />
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={saveClass}
                  disabled={saving}
                  className="rounded-xl bg-[#6366F1] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5558E8] disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>

              <div className="my-7 border-t border-[#E8ECF4]" />

              <div>
                <div className="mb-4">
                  <h3 className="font-bold text-[#172033]">
                    Students
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Students can belong to more than one class.
                  </p>
                </div>

                <div className="space-y-2">

                  {students
                    .filter(
                      (student) =>
                        student.school_id ===
                        selectedClass.school_id
                    )
                    .map(
                      (student) => {
                        const assigned =
                          localMemberships.some(
                            (
                              membership
                            ) =>
                              membership.group_id ===
                                selectedClass.id &&
                              membership.user_id ===
                                student.id
                          );

                        const busy =
                          busyStudent ===
                          student.id;

                        return (
                          <div
                            key={
                              student.id
                            }
                            className="flex items-center gap-4 rounded-xl border border-[#E8ECF4] px-4 py-3"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-sm font-bold text-[#6366F1]">
                              {(
                                student.full_name ||
                                student.email
                              )
                                .charAt(
                                  0
                                )
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#172033]">
                                {student.full_name ||
                                  "Student"}
                              </p>

                              <p className="truncate text-xs text-slate-500">
                                {
                                  student.email
                                }
                              </p>
                            </div>

                            {!student.is_active &&
                              !assigned && (
                                <span className="text-xs font-medium text-slate-400">
                                  Inactive
                                </span>
                              )}

                            <button
                              type="button"
                              disabled={
                                busy ||
                                (!student.is_active &&
                                  !assigned)
                              }
                              onClick={() =>
                                toggleStudent(
                                  student
                                )
                              }
                              className={`rounded-lg px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                assigned
                                  ? "border border-[#D8DEEA] bg-white text-slate-600 hover:bg-slate-50"
                                  : "bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#E0E7FF]"
                              }`}
                            >
                              {busy
                                ? "..."
                                : assigned
                                  ? "Remove"
                                  : "Add"}
                            </button>
                          </div>
                        );
                      }
                    )}

                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}