"use client";

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

type UsersTableProps = {
  users: UserRow[];
  currentUserId: string;
  schools: School[];
};

export default function UsersTable({
  users,
  currentUserId,
  schools,
}: UsersTableProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [school, setSchool] = useState("all");
  const [status, setStatus] = useState("all");

  const [selectedUser, setSelectedUser] =
    useState<UserRow | null>(null);

  const [editName, setEditName] =
    useState("");

  const [editRole, setEditRole] =
    useState<"student" | "admin">("student");

  const [editActive, setEditActive] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [editError, setEditError] =
    useState("");

  const [
    showPasswordReset,
    setShowPasswordReset,
  ] = useState(false);

  const [newPassword, setNewPassword] =
    useState("");

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

  /*
   * Create a fast lookup:
   *
   * school ID -> school information
   */
  const schoolMap = useMemo(() => {
    return new Map(
      schools.map((item) => [
        item.id,
        item,
      ])
    );
  }, [schools]);

  function getSchoolName(
    schoolId: string | null
  ) {
    if (!schoolId) {
      return "Not assigned";
    }

    const foundSchool =
      schoolMap.get(schoolId);

    if (!foundSchool) {
      return "Unknown school";
    }

    return foundSchool.name;
  }

  function getSchoolDisplay(
    schoolId: string | null
  ) {
    if (!schoolId) {
      return "Not assigned";
    }

    const foundSchool =
      schoolMap.get(schoolId);

    if (!foundSchool) {
      return "Unknown school";
    }

    if (foundSchool.code) {
      return `${foundSchool.name} (${foundSchool.code})`;
    }

    return foundSchool.name;
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

    if (userRole === "student") {
      return "Student";
    }

    return userRole;
  }

  const filteredUsers =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return users
        .filter((user) => {
          const userSchool =
            user.school_id
              ? schoolMap.get(
                  user.school_id
                )
              : undefined;

          const schoolName =
            userSchool?.name
              ?.toLowerCase() || "";

          const schoolCode =
            userSchool?.code
              ?.toLowerCase() || "";

          const matchesSearch =
            !query ||
            (user.full_name || "")
              .toLowerCase()
              .includes(query) ||
            user.email
              .toLowerCase()
              .includes(query) ||
            schoolName.includes(query) ||
            schoolCode.includes(query);

          const matchesRole =
            role === "all" ||
            user.role === role;

          const matchesSchool =
            school === "all" ||
            (school ===
              "platform" &&
              user.role ===
                "super_admin") ||
            user.school_id ===
              school;

          const matchesStatus =
            status === "all" ||
            (status === "active" &&
              user.is_active) ||
            (status ===
              "inactive" &&
              !user.is_active);

          return (
            matchesSearch &&
            matchesRole &&
            matchesSchool &&
            matchesStatus
          );
        })
        .sort((a, b) => {
          /*
           * Current account first.
           */
          if (
            a.id ===
              currentUserId &&
            b.id !== currentUserId
          ) {
            return -1;
          }

          if (
            b.id ===
              currentUserId &&
            a.id !== currentUserId
          ) {
            return 1;
          }

          /*
           * Super Administrator
           * School Administrator
           * Student
           */
          const roleOrder: Record<
            string,
            number
          > = {
            super_admin: 0,
            admin: 1,
            student: 2,
          };

          const roleDifference =
            (roleOrder[a.role] ??
              99) -
            (roleOrder[b.role] ??
              99);

          if (
            roleDifference !== 0
          ) {
            return roleDifference;
          }

          const aName =
            a.full_name ||
            a.email;

          const bName =
            b.full_name ||
            b.email;

          return aName.localeCompare(
            bName
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

  async function saveUser() {
    if (!selectedUser) {
      return;
    }

    if (!editName.trim()) {
      setEditError(
        "Full name is required."
      );

      return;
    }

    setSaving(true);
    setEditError("");

    try {
      /*
       * Super Administrator role changes
       * are not performed here.
       *
       * The server independently protects
       * Super Administrator accounts.
       */
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
      <div className="mt-8 overflow-hidden rounded-2xl bg-white text-slate-900 shadow-sm">

        {/* Filters */}
        <div className="border-b border-slate-200 p-6">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

            <div>
              <h2 className="font-semibold text-slate-900">
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

            <div className="grid gap-3 sm:grid-cols-2 xl:flex">

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
                className="min-w-56 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
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
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none"
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
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none"
                >
                  <option value="all">
                    All Schools
                  </option>

                  <option value="platform">
                    Platform-wide
                  </option>

                  {schools.map(
                    (
                      schoolItem
                    ) => (
                      <option
                        key={
                          schoolItem.id
                        }
                        value={
                          schoolItem.id
                        }
                      >
                        {
                          schoolItem.name
                        }
                        {schoolItem.code
                          ? ` (${schoolItem.code})`
                          : ""}
                        {!schoolItem.is_active
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
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none"
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

            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
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

            <tbody className="divide-y divide-slate-100">

              {filteredUsers.map(
                (user) => {
                  const isCurrentUser =
                    user.id ===
                    currentUserId;

                  const isSuperAdmin =
                    user.role ===
                    "super_admin";

                  return (
                    <tr
                      key={user.id}
                      className={
                        isCurrentUser
                          ? "bg-blue-50/40 text-sm"
                          : "text-sm"
                      }
                    >

                      {/* Name */}
                      <td className="px-6 py-4 font-medium text-slate-900">

                        <div className="flex items-center gap-2">

                          <span>
                            {user.full_name ||
                              "No name"}
                          </span>

                          {isCurrentUser && (
                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                              Me
                            </span>
                          )}

                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 text-slate-600">
                        {user.email}
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {roleLabel(
                            user.role
                          )}
                        </span>

                      </td>

                      {/* School */}
                      <td className="px-6 py-4 text-slate-600">

                        {isSuperAdmin ? (
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

                      {/* Status */}
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

                      {/* Created */}
                      <td className="px-6 py-4 text-slate-500">

                        {new Date(
                          user.created_at
                        ).toLocaleDateString()}

                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">

                        <button
                          type="button"
                          onClick={() =>
                            openManage(
                              user
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
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
                    No users match your
                    filters.
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

          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white text-slate-900 shadow-xl">

            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

              <div>

                <div className="flex items-center gap-2">

                  <h2 className="text-xl font-bold">
                    Manage User
                  </h2>

                  {selectedUser.id ===
                    currentUserId && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      Me
                    </span>
                  )}

                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedUser.email}
                </p>

              </div>

              <button
                type="button"
                onClick={closeManage}
                disabled={
                  saving ||
                  passwordSaving
                }
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                ✕
              </button>

            </div>

            <div className="space-y-5 p-6">

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
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
                  placeholder="Enter full name"
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

                <p className="mt-2 text-xs text-slate-500">
                  Email changes will be
                  added separately.
                </p>

              </div>

              {/* School */}
              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  School
                </label>

                <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600">

                  {selectedUser.role ===
                  "super_admin"
                    ? "Platform-wide — Super Administrator"
                    : getSchoolDisplay(
                        selectedUser.school_id
                      )}

                </div>

                {selectedUser.role !==
                  "super_admin" && (
                  <p className="mt-2 text-xs text-slate-500">
                    School transfers will
                    use a separate protected
                    workflow.
                  </p>
                )}

              </div>

              {/* Role */}
              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Role
                </label>

                {selectedUser.role ===
                "super_admin" ? (
                  <>
                    <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600">
                      Super Administrator
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      Super Administrator
                      roles cannot be changed
                      from standard user
                      management.
                    </p>
                  </>
                ) : (
                  <>
                    <select
                      value={editRole}
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
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    >

                      <option value="student">
                        Student
                      </option>

                      <option value="admin">
                        School Administrator
                      </option>

                    </select>

                    {selectedUser.id ===
                      currentUserId && (
                      <p className="mt-2 text-xs text-slate-500">
                        You cannot change
                        your own Administrator
                        role.
                      </p>
                    )}

                  </>
                )}

              </div>

              {/* Account Status */}
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                >

                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>

                </select>

                {selectedUser.id ===
                  currentUserId && (
                  <p className="mt-2 text-xs text-slate-500">
                    You cannot deactivate
                    your own account.
                  </p>
                )}

              </div>

              {/* Password */}
              {selectedUser.role !==
                "super_admin" && (
                <div className="border-t border-slate-200 pt-5">

                  <div className="flex items-center justify-between gap-4">

                    <div>

                      <p className="text-sm font-semibold text-slate-700">
                        Password
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Set a new temporary
                        password for this
                        account.
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
                        className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Set New Password
                      </button>
                    )}

                  </div>

                  {showPasswordReset && (
                    <div className="mt-4 space-y-4 rounded-xl bg-slate-50 p-4">

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
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
                          placeholder="Minimum 8 characters"
                        />

                      </div>

                      <div>

                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Confirm New
                          Password
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
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
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
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                        >
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
                          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
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
                      {passwordMessage}
                    </div>
                  )}

                </div>
              )}

              {/* Edit Error */}
              {editError && (
                <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
                  {editError}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">

                <button
                  type="button"
                  onClick={
                    closeManage
                  }
                  disabled={
                    saving ||
                    passwordSaving
                  }
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
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
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
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