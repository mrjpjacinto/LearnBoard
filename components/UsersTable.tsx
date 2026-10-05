"use client";
import { Notification } from "./LmsToast";
import ActionIcon from "@/components/ActionIcon";


import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type UserRow = {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
  school_id: string | null;
  created_at: string;
};

type School = {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
};

type ClassRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  school_id: string | null;
};

type Membership = {
  group_id: string;
  user_id: string;
};

type UsersTableProps = {
  users: UserRow[];
  currentUserId: string;
  schools: School[];
  classes?: ClassRow[];
  memberships?: Membership[];
  isSuperAdmin?: boolean;
};

export default function UsersTable({
  users,
  currentUserId,
  schools,
  classes = [],
  memberships = [],
  isSuperAdmin = false,
}: UsersTableProps) {
  const router = useRouter();

  const [search, setSearch] =
    useState("");

  const [role, setRole] =
    useState("all");

  const [school, setSchool] =
    useState("all");

  const [status, setStatus] =
    useState("all");

  const [
    selectedUser,
    setSelectedUser,
  ] = useState<UserRow | null>(
    null
  );

  const [
    editName,
    setEditName,
  ] = useState("");

  const [
    editRole,
    setEditRole,
  ] = useState<
    "student" | "admin"
  >("student");

  const [
    editActive,
    setEditActive,
  ] = useState(true);

  const [
    editSchoolId,
    setEditSchoolId,
  ] = useState("");

  const [
    editClassIds,
    setEditClassIds,
  ] = useState<string[]>([]);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    editError,
    setEditError,
  ] = useState("");

  const [
    showPasswordReset,
    setShowPasswordReset,
  ] = useState(false);

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    passwordSaving,
    setPasswordSaving,
  ] = useState(false);

  const [
    passwordMessage,
    setPasswordMessage,
  ] = useState("");

  const [
    passwordSuccess,
    setPasswordSuccess,
  ] = useState(false);

  const schoolMap =
    useMemo(() => {
      return new Map(
        schools.map((item) => [
          item.id,
          item,
        ])
      );
    }, [schools]);

  const classMap =
    useMemo(() => {
      return new Map(
        classes.map((item) => [
          item.id,
          item,
        ])
      );
    }, [classes]);

  function getSchoolName(
    schoolId: string | null
  ) {
    if (!schoolId) {
      return "Not assigned";
    }

    return (
      schoolMap.get(schoolId)
        ?.name ||
      "Unknown school"
    );
  }

  function getSchoolDisplay(
    schoolId: string | null
  ) {
    if (!schoolId) {
      return "Not assigned";
    }

    const found =
      schoolMap.get(schoolId);

    if (!found) {
      return "Unknown school";
    }

    return found.code
      ? `${found.name} (${found.code})`
      : found.name;
  }

  function roleLabel(
    userRole: string
  ) {
    if (
      userRole === "super_admin"
    ) {
      return "Super Administrator";
    }

    if (userRole === "admin") {
      return "School Administrator";
    }

    if (
      userRole === "student"
    ) {
      return "Student";
    }

    return userRole;
  }

  const filteredUsers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return users
        .filter((user) => {
          const userSchool =
            user.school_id
              ? schoolMap.get(
                  user.school_id
                )
              : undefined;

          const schoolName =
            (
              userSchool?.name ||
              ""
            ).toLowerCase();

          const schoolCode =
            (
              userSchool?.code ||
              ""
            ).toLowerCase();

          const matchesSearch =
            !query ||
            (
              user.full_name ||
              ""
            )
              .toLowerCase()
              .includes(query) ||
            user.email
              .toLowerCase()
              .includes(query) ||
            schoolName.includes(
              query
            ) ||
            schoolCode.includes(
              query
            );

          const matchesRole =
            role === "all" ||
            user.role === role;

          const matchesSchool =
            school === "all" ||
            (
              school ===
                "platform" &&
              user.role ===
                "super_admin"
            ) ||
            user.school_id ===
              school;

          const matchesStatus =
            status === "all" ||
            (
              status ===
                "active" &&
              user.is_active
            ) ||
            (
              status ===
                "inactive" &&
              !user.is_active
            );

          return (
            matchesSearch &&
            matchesRole &&
            matchesSchool &&
            matchesStatus
          );
        })
        .sort((a, b) => {
          if (
            a.id ===
              currentUserId &&
            b.id !==
              currentUserId
          ) {
            return -1;
          }

          if (
            b.id ===
              currentUserId &&
            a.id !==
              currentUserId
          ) {
            return 1;
          }

          const roleOrder: Record<
            string,
            number
          > = {
            super_admin: 0,
            admin: 1,
            student: 2,
          };

          const difference =
            (
              roleOrder[
                a.role
              ] ?? 99
            ) -
            (
              roleOrder[
                b.role
              ] ?? 99
            );

          if (
            difference !== 0
          ) {
            return difference;
          }

          return (
            a.full_name ||
            a.email
          ).localeCompare(
            b.full_name ||
              b.email
          );
        });
    }, [
      users,
      search,
      role,
      school,
      status,
      currentUserId,
      schoolMap,
    ]);

  const availableClasses =
    useMemo(() => {
      if (!editSchoolId) {
        return [];
      }

      return classes
        .filter(
          (item) =>
            item.school_id ===
            editSchoolId
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name
          )
        );
    }, [
      classes,
      editSchoolId,
    ]);

  function openManage(
    user: UserRow
  ) {
    setSelectedUser(user);

    setEditName(
      user.full_name || ""
    );

    setEditRole(
      user.role === "admin"
        ? "admin"
        : "student"
    );

    setEditActive(
      user.is_active
    );

    setEditSchoolId(
      user.school_id || ""
    );

    setEditClassIds(
      memberships
        .filter(
          (item) =>
            item.user_id ===
            user.id
        )
        .map(
          (item) =>
            item.group_id
        )
        .filter((id) =>
          classMap.has(id)
        )
    );

    setEditError("");

    setShowPasswordReset(
      false
    );

    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("");
    setPasswordSuccess(false);
  }

  function closeManage() {
    if (
      saving ||
      passwordSaving
    ) {
      return;
    }

    setSelectedUser(null);
    setEditError("");

    setShowPasswordReset(
      false
    );

    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("");
    setPasswordSuccess(false);
  }

  function changeSchool(
    nextSchoolId: string
  ) {
    setEditSchoolId(
      nextSchoolId
    );

    /*
     * Classes are school-local.
     * Remove selections that do
     * not belong to the newly
     * selected school.
     */
    setEditClassIds(
      (current) =>
        current.filter(
          (classId) =>
            classMap.get(
              classId
            )?.school_id ===
            nextSchoolId
        )
    );
  }

  function toggleClass(
    classId: string
  ) {
    setEditClassIds(
      (current) =>
        current.includes(
          classId
        )
          ? current.filter(
              (id) =>
                id !== classId
            )
          : [
              ...current,
              classId,
            ]
    );
  }

  async function saveUser() {
    if (!selectedUser) {
      return;
    }

    if (
      !editName.trim()
    ) {
      setEditError(
        "Full name is required."
      );

      return;
    }

    if (
      selectedUser.role !==
        "super_admin" &&
      isSuperAdmin &&
      !editSchoolId
    ) {
      setEditError(
        "Please select a school."
      );

      return;
    }

    setSaving(true);
    setEditError("");

    try {
      const roleToSend =
        selectedUser.role ===
        "super_admin"
          ? "super_admin"
          : editRole;

      const response =
        await fetch(
          `/api/admin/users/${selectedUser.id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              fullName:
                editName,

              role:
                roleToSend,

              isActive:
                editActive,

              schoolId:
                selectedUser.role ===
                "super_admin"
                  ? null
                  : editSchoolId,

              classIds:
                roleToSend ===
                "student"
                  ? editClassIds
                  : [],
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setEditError(
          result.error ||
            "Unable to update user."
        );

        return;
      }

      setSelectedUser(null);

      router.refresh();
    } catch {
      setEditError(
        "Unable to connect to the server."
      );
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (!selectedUser) {
      return;
    }

    setPasswordMessage("");
    setPasswordSuccess(false);

    if (
      newPassword.length < 8
    ) {
      setPasswordMessage(
        "Password must be at least 8 characters."
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setPasswordMessage(
        "The passwords do not match."
      );

      return;
    }

    setPasswordSaving(true);

    try {
      const response =
        await fetch(
          `/api/admin/users/${selectedUser.id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              password:
                newPassword,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setPasswordMessage(
          result.error ||
            "Unable to update password."
        );

        return;
      }

      setNewPassword("");
      setConfirmPassword("");

      setShowPasswordReset(
        false
      );

      setPasswordSuccess(true);

      setPasswordMessage(
        "Password updated successfully."
      );
    } catch {
      setPasswordMessage(
        "Unable to connect to the server."
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <>
      <div className="mt-layout overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white text-slate-900 shadow-sm">

        {/* Filters */}
        <div className="border-b border-[#E3E8F2] p-6">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

            <div>
              <h2 className="font-semibold text-[#172033]">
                All Users
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {
                  filteredUsers.length
                }{" "}
                user
                {filteredUsers.length ===
                1
                  ? ""
                  : "s"}{" "}
                shown
              </p>
            </div>

            <div className="grid gap-layout sm:grid-cols-2 xl:flex">

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
                placeholder="Search users or schools..."
                className="min-w-56 rounded-xl border border-[#D8DEEA] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#818CF8]"
              />

              <select
                value={role}
                onChange={(
                  event
                ) =>
                  setRole(
                    event.target
                      .value
                  )
                }
                className="rounded-xl border border-[#D8DEEA] bg-white px-4 py-2.5 text-sm outline-none"
              >
                <option value="all">
                  All Roles
                </option>

                <option value="super_admin">
                  Super Administrators
                </option>

                <option value="admin">
                  School Administrators
                </option>

                <option value="student">
                  Students
                </option>
              </select>

              {schools.length >
                0 && (
                <select
                  value={school}
                  onChange={(
                    event
                  ) =>
                    setSchool(
                      event.target
                        .value
                    )
                  }
                  className="rounded-xl border border-[#D8DEEA] bg-white px-4 py-2.5 text-sm outline-none"
                >
                  <option value="all">
                    All Schools
                  </option>

                  <option value="platform">
                    Platform-wide
                  </option>

                  {schools.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
                      >
                        {
                          item.name
                        }
                        {item.code
                          ? ` (${item.code})`
                          : ""}
                        {!item.is_active
                          ? " — Inactive"
                          : ""}
                      </option>
                    )
                  )}
                </select>
              )}

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
                className="rounded-xl border border-[#D8DEEA] bg-white px-4 py-2.5 text-sm outline-none"
              >
                <option value="all">
                  Any Status
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

            <thead className="bg-[#F8FAFC] text-xs uppercase text-slate-500">
              <tr>

                <th className="px-6 py-4">
                  Name
                </th>

                <th className="px-6 py-4">
                  Email
                </th>

                <th className="px-6 py-4">
                  Role
                </th>

                <th className="px-6 py-4">
                  School
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

              {filteredUsers.map(
                (user) => {
                  const isCurrentUser =
                    user.id ===
                    currentUserId;

                  const userIsSuperAdmin =
                    user.role ===
                    "super_admin";

                  return (
                    <tr
                      key={user.id}
                      className={
                        isCurrentUser
                          ? "bg-[#F5F6FF] text-sm"
                          : "text-sm"
                      }
                    >

                      <td className="px-6 py-4 font-medium text-[#172033]">

                        <div className="flex items-center gap-2">

                          <span>
                            {user.full_name ||
                              "No name"}
                          </span>

                          {isCurrentUser && (
                            <span className="rounded-full bg-[#EEF2FF] px-2.5 py-1 text-xs font-semibold text-[#4F46E5]">
                              (you)
                            </span>
                          )}

                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {user.email}
                      </td>

                      <td className="px-6 py-4">

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {roleLabel(
                            user.role
                          )}
                        </span>

                      </td>

                      <td className="px-6 py-4 text-slate-600">

                        {userIsSuperAdmin ? (
                          <span className="font-medium text-slate-700">
                            Platform-wide
                          </span>
                        ) : (
                          <div>

                            <p className="font-medium text-slate-700">
                              {getSchoolName(
                                user.school_id
                              )}
                            </p>

                            {user.school_id &&
                              schoolMap.get(
                                user.school_id
                              )?.code && (
                              <p className="mt-1 text-xs text-slate-400">
                                {
                                  schoolMap.get(
                                    user.school_id
                                  )?.code
                                }
                              </p>
                            )}

                          </div>
                        )}

                      </td>

                      <td className="px-6 py-4">

                        <span
                          className={
                            user.is_active
                              ? "font-medium text-emerald-700"
                              : "font-medium text-red-600"
                          }
                        >
                          {user.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>

                      </td>

                      <td className="px-6 py-4 text-slate-500">

                        {new Date(
                          user.created_at
                        ).toLocaleDateString()}

                      </td>

                      <td className="px-6 py-4 text-right">

                        <button
                          type="button"
                          onClick={() =>
                            openManage(
                              user
                            )
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D8DEEA] bg-white px-3 py-2 text-xs font-semibold text-[#475467] transition hover:border-[#A5B4FC] hover:bg-[#F5F6FF] hover:text-[#4F46E5]"
                        ><ActionIcon name="next" />
                          Manage
                        </button>

                      </td>

                    </tr>
                  );
                }
              )}

              {filteredUsers.length ===
                0 && (
                <tr>

                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No users match your filters.
                  </td>

                </tr>
              )}

            </tbody>
          </table>
        </div>
      </div>

      {/* Manage User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white text-slate-900 shadow-xl">

            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E3E8F2] bg-white px-6 py-5">

              <div>

                <div className="flex items-center gap-2">

                  <h2 className="text-xl font-bold text-[#172033]">
                    Manage User
                  </h2>

                  {selectedUser.id ===
                    currentUserId && (
                    <span className="rounded-full bg-[#EEF2FF] px-2.5 py-1 text-xs font-semibold text-[#4F46E5]">
                      (you)
                    </span>
                  )}

                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedUser.email}
                </p>

              </div>

              <button
                type="button"
                aria-label="Close user details"
                onClick={
                  closeManage
                }
                disabled={
                  saving ||
                  passwordSaving
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              ><ActionIcon name="close" />
              </button>

            </div>

            <div className="stack-layout p-6">

              {/* Full Name */}
              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Full Name
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
                  className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 outline-none focus:border-[#818CF8]"
                />

              </div>

              {/* Email */}
              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email
                </label>

                <input
                  type="email"
                  value={
                    selectedUser.email
                  }
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
                />

              </div>

              {/* School */}
              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  School
                </label>

                {selectedUser.role ===
                "super_admin" ? (

                  <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600">
                    Platform-wide — Super Administrator
                  </div>

                ) : isSuperAdmin ? (
                  <>

                    <select
                      value={
                        editSchoolId
                      }
                      onChange={(
                        event
                      ) =>
                        changeSchool(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 outline-none focus:border-[#818CF8]"
                    >

                      <option value="">
                        Select a school
                      </option>

                      {schools.map(
                        (
                          item
                        ) => (
                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                            disabled={
                              !item.is_active
                            }
                          >
                            {
                              item.name
                            }
                            {item.code
                              ? ` (${item.code})`
                              : ""}
                            {!item.is_active
                              ? " — Inactive"
                              : ""}
                          </option>
                        )
                      )}

                    </select>

                    {selectedUser.school_id !==
                      editSchoolId && (
                      <p className="mt-2 text-xs font-medium text-amber-700">
                        Changing schools will remove class memberships from the previous school.
                      </p>
                    )}

                  </>
                ) : (

                  <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600">
                    {getSchoolDisplay(
                      selectedUser.school_id
                    )}
                  </div>

                )}

              </div>

              {/* Role */}
              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Role
                </label>

                {selectedUser.role ===
                "super_admin" ? (

                  <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600">
                    Super Administrator
                  </div>

                ) : (

                  <select
                    value={
                      editRole
                    }
                    disabled={
                      selectedUser.id ===
                      currentUserId
                    }
                    onChange={(
                      event
                    ) =>
                      setEditRole(
                        event.target
                          .value as
                          | "student"
                          | "admin"
                      )
                    }
                    className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  >

                    <option value="student">
                      Student
                    </option>

                    <option value="admin">
                      School Administrator
                    </option>

                  </select>

                )}

              </div>

              {/* Classes */}
              {selectedUser.role !==
                "super_admin" &&
                editRole ===
                  "student" && (

                <div>

                  <div className="mb-3 flex items-center justify-between gap-4">

                    <div>

                      <label className="block text-sm font-semibold text-slate-700">
                        Classes
                      </label>

                      <p className="mt-1 text-xs text-slate-500">
                        A student can belong to multiple classes.
                      </p>

                    </div>

                    <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#4F46E5]">
                      {
                        editClassIds.length
                      }{" "}
                      selected
                    </span>

                  </div>

                  {!editSchoolId ? (

                    <div className="rounded-xl border border-dashed border-[#D8DEEA] bg-[#F8FAFC] p-5 text-sm text-slate-500">
                      Select a school before assigning classes.
                    </div>

                  ) : availableClasses.length ===
                    0 ? (

                    <div className="rounded-xl border border-dashed border-[#D8DEEA] bg-[#F8FAFC] p-5 text-sm text-slate-500">
                      This school does not have any classes yet.
                    </div>

                  ) : (

                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-[#E3E8F2] p-3">

                      {availableClasses.map(
                        (
                          classItem
                        ) => {
                          const checked =
                            editClassIds.includes(
                              classItem.id
                            );

                          return (
                            <label
                              key={
                                classItem.id
                              }
                              className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-3 transition ${
                                checked
                                  ? "border-[#A5B4FC] bg-[#F5F6FF]"
                                  : "border-[#E3E8F2] bg-white hover:bg-slate-50"
                              }`}
                            >

                              <div>

                                <p className="text-sm font-semibold text-[#172033]">
                                  {
                                    classItem.name
                                  }
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {classItem.is_active
                                    ? "Active"
                                    : "Inactive"}
                                </p>

                              </div>

                              <input
                                type="checkbox"
                                checked={
                                  checked
                                }
                                disabled={
                                  !classItem.is_active &&
                                  !checked
                                }
                                onChange={() =>
                                  toggleClass(
                                    classItem.id
                                  )
                                }
                                className="h-4 w-4 accent-[#6366F1]"
                              />

                            </label>
                          );
                        }
                      )}

                    </div>

                  )}

                </div>
              )}

              {/* Status */}
              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Account Status
                </label>

                <select
                  value={
                    editActive
                      ? "active"
                      : "inactive"
                  }
                  disabled={
                    selectedUser.id ===
                      currentUserId ||
                    selectedUser.role ===
                      "super_admin"
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
                  className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                >

                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>

                </select>

              </div>

              {/* Password */}
              {selectedUser.role !==
                "super_admin" && (

                <div className="border-t border-[#E3E8F2] pt-5">

                  <div className="flex items-center justify-between gap-4">

                    <div>

                      <p className="text-sm font-semibold text-slate-700">
                        Password
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Set a new temporary password for this account.
                      </p>

                    </div>

                    {!showPasswordReset && (

                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordReset(
                            true
                          );

                          setPasswordMessage(
                            ""
                          );

                          setPasswordSuccess(
                            false
                          );
                        }}
                        className="inline-flex items-center justify-center gap-2 shrink-0 rounded-lg border border-[#D8DEEA] bg-white px-3 py-2 text-xs font-semibold text-[#475467] hover:bg-[#F5F6FF]"
                      ><ActionIcon name="key" />
                        Set New Password
                      </button>

                    )}

                  </div>

                  {showPasswordReset && (

                    <div className="mt-4 space-y-4 rounded-xl bg-[#F8FAFC] p-4">

                      <div>

                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          New Password
                        </label>

                        <input
                          type="password"
                          minLength={8}
                          value={
                            newPassword
                          }
                          onChange={(
                            event
                          ) =>
                            setNewPassword(
                              event.target
                                .value
                            )
                          }
                          className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 outline-none focus:border-[#818CF8]"
                          placeholder="Minimum 8 characters"
                        />

                      </div>

                      <div>

                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Confirm New Password
                        </label>

                        <input
                          type="password"
                          minLength={8}
                          value={
                            confirmPassword
                          }
                          onChange={(
                            event
                          ) =>
                            setConfirmPassword(
                              event.target
                                .value
                            )
                          }
                          className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 outline-none focus:border-[#818CF8]"
                          placeholder="Enter the password again"
                        />

                      </div>

                      <div className="flex gap-3">

                        <button
                          type="button"
                          onClick={() => {
                            setShowPasswordReset(
                              false
                            );

                            setNewPassword(
                              ""
                            );

                            setConfirmPassword(
                              ""
                            );

                            setPasswordMessage(
                              ""
                            );

                            setPasswordSuccess(
                              false
                            );
                          }}
                          disabled={
                            passwordSaving
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D8DEEA] bg-white px-4 py-2 text-xs font-semibold text-[#475467] disabled:opacity-50"
                        ><ActionIcon name="close" />
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={
                            resetPassword
                          }
                          disabled={
                            passwordSaving
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4F46E5] disabled:opacity-50"
                        ><ActionIcon name="key" />
                          {passwordSaving
                            ? "Updating..."
                            : "Update Password"}
                        </button>

                      </div>

                    </div>
                  )}

                  {passwordMessage && (

                    <div
                      className={`mt-3 rounded-xl p-3 text-sm font-medium ${
                        passwordSuccess
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {
                        passwordMessage
                      }
                    </div>

                  )}

                </div>
              )}

              {/* Error */}
              {editError && <Notification type="error" message={editError} onClose={() => setEditError("")} />}

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-[#E3E8F2] pt-5">

                <button
                  type="button"
                  onClick={
                    closeManage
                  }
                  disabled={
                    saving ||
                    passwordSaving
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8DEEA] px-5 py-3 text-sm font-semibold text-[#475467] disabled:opacity-50"
                ><ActionIcon name="close" />
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    saveUser
                  }
                  disabled={
                    saving ||
                    passwordSaving
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4F46E5] disabled:opacity-50"
                ><ActionIcon name="save" />
                  {saving
                    ? "Saving..."
                    : selectedUser.role ===
                        "super_admin"
                      ? "Save Name"
                      : "Save Changes"}
                </button>

              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
