"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type UserRow = {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export default function UsersTable({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");

  const [selectedUser, setSelectedUser] =
    useState<UserRow | null>(null);

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] =
    useState<"student" | "admin">("student");
  const [editActive, setEditActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users
      .filter((user) => {
        const matchesSearch =
          !query ||
          (user.full_name || "")
            .toLowerCase()
            .includes(query) ||
          user.email.toLowerCase().includes(query);

        const matchesRole =
          role === "all" || user.role === role;

        const matchesStatus =
          status === "all" ||
          (status === "active" && user.is_active) ||
          (status === "inactive" && !user.is_active);

        return (
          matchesSearch &&
          matchesRole &&
          matchesStatus
        );
      })
      .sort((a, b) => {
        if (
          a.id === currentUserId &&
          b.id !== currentUserId
        ) {
          return -1;
        }

        if (
          b.id === currentUserId &&
          a.id !== currentUserId
        ) {
          return 1;
        }

        if (
          a.role === "admin" &&
          b.role !== "admin"
        ) {
          return -1;
        }

        if (
          b.role === "admin" &&
          a.role !== "admin"
        ) {
          return 1;
        }

        const aName = a.full_name || a.email;
        const bName = b.full_name || b.email;

        return aName.localeCompare(bName);
      });
  }, [
    users,
    search,
    role,
    status,
    currentUserId,
  ]);

  function openManage(user: UserRow) {
    setSelectedUser(user);
    setEditName(user.full_name || "");
    setEditRole(
      user.role === "admin" ? "admin" : "student"
    );
    setEditActive(user.is_active);
    setEditError("");
  }

  function closeManage() {
    if (saving) return;

    setSelectedUser(null);
    setEditError("");
  }

  async function saveUser() {
    if (!selectedUser) return;

    if (!editName.trim()) {
      setEditError("Full name is required.");
      return;
    }

    setSaving(true);
    setEditError("");

    try {
      const response = await fetch(
        `/api/admin/users/${selectedUser.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: editName,
            role: editRole,
            isActive: editActive,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setEditError(
          result.error || "Unable to update user."
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

  return (
    <>
      <div className="mt-8 overflow-hidden rounded-2xl bg-white text-slate-900 shadow-sm">

        <div className="border-b border-slate-200 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <h2 className="font-semibold text-slate-900">
                All Users
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filteredUsers.length} user
                {filteredUsers.length === 1
                  ? ""
                  : "s"}{" "}
                shown
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search name or email..."
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
              />

              <select
                value={role}
                onChange={(event) =>
                  setRole(event.target.value)
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none"
              >
                <option value="all">
                  All Roles
                </option>
                <option value="student">
                  Students
                </option>
                <option value="admin">
                  Administrators
                </option>
              </select>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
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

              {filteredUsers.map((user) => {
                const isCurrentUser =
                  user.id === currentUserId;

                return (
                  <tr
                    key={user.id}
                    className={
                      isCurrentUser
                        ? "bg-blue-50/40 text-sm"
                        : "text-sm"
                    }
                  >

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

                    <td className="px-6 py-4 text-slate-600">
                      {user.email}
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                        {user.role}
                      </span>
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
                          openManage(user)
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Manage
                      </button>
                    </td>

                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No users match your search.
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

          <div className="w-full max-w-lg rounded-2xl bg-white text-slate-900 shadow-xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div>
                <h2 className="text-xl font-bold">
                  Manage User
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedUser.email}
                </p>
              </div>

              <button
                type="button"
                onClick={closeManage}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>

            </div>

            <div className="space-y-5 p-6">

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Full Name
                </label>

                <input
                  type="text"
                  value={editName}
                  onChange={(event) =>
                    setEditName(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email
                </label>

                <input
                  type="email"
                  value={selectedUser.email}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Email changes will be added separately.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Role
                </label>

                <select
                  value={editRole}
                  disabled={
                    selectedUser.id ===
                    currentUserId
                  }
                  onChange={(event) =>
                    setEditRole(
                      event.target.value as
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
                    Administrator
                  </option>
                </select>

                {selectedUser.id ===
                  currentUserId && (
                  <p className="mt-2 text-xs text-slate-500">
                    You cannot change your own
                    Administrator role.
                  </p>
                )}
              </div>

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
                    currentUserId
                  }
                  onChange={(event) =>
                    setEditActive(
                      event.target.value ===
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
                    You cannot deactivate your own
                    account.
                  </p>
                )}
              </div>

              {editError && (
                <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
                  {editError}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">

                <button
                  type="button"
                  onClick={closeManage}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveUser}
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
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