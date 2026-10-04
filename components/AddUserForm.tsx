"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type School = {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
};

type AddUserFormProps = {
  isSuperAdmin: boolean;
  schools: School[];
};

export default function AddUserForm({
  isSuperAdmin,
  schools,
}: AddUserFormProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [role, setRole] =
    useState<"student" | "admin">("student");

  const [schoolId, setSchoolId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activeSchools = schools.filter(
    (school) => school.is_active
  );

  function resetForm() {
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("student");
    setSchoolId("");
    setError("");
    setSuccess("");
  }

  function closeModal() {
    if (loading) {
      return;
    }

    setOpen(false);
    resetForm();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (isSuperAdmin && !schoolId) {
      setError(
        "Please select a school for this user."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/users",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName,
            email,
            password,
            role,

            /*
             * Super Admin selects the destination school.
             *
             * School Admin does not send a school.
             * The server will force the new user into
             * the School Admin's own school.
             */
            schoolId:
              isSuperAdmin
                ? schoolId
                : null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Unable to create user."
        );
        return;
      }

      setSuccess(
        "User created successfully."
      );

      setFullName("");
      setEmail("");
      setPassword("");
      setRole("student");
      setSchoolId("");

      router.refresh();

      setTimeout(() => {
        setOpen(false);
        setSuccess("");
      }, 800);
    } catch {
      setError(
        "Unable to connect to the server."
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
        + Add User
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white text-slate-900 shadow-xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Add User
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create a new LearnBoard account.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                ✕
              </button>

            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >

              <div>
                <label
                  htmlFor="new-user-name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Full Name
                </label>

                <input
                  id="new-user-name"
                  required
                  value={fullName}
                  onChange={(event) =>
                    setFullName(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
                  placeholder="Full name"
                />
              </div>

              <div>
                <label
                  htmlFor="new-user-email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email
                </label>

                <input
                  id="new-user-email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="new-user-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Temporary Password
                </label>

                <input
                  id="new-user-password"
                  required
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
                  placeholder="Minimum 8 characters"
                />

                <p className="mt-2 text-xs text-slate-500">
                  The user will use this password
                  to sign in.
                </p>
              </div>

              <div>
                <label
                  htmlFor="new-user-role"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Role
                </label>

                <select
                  id="new-user-role"
                  value={role}
                  onChange={(event) =>
                    setRole(
                      event.target.value as
                        | "student"
                        | "admin"
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                >
                  <option value="student">
                    Student
                  </option>

                  <option value="admin">
                    School Administrator
                  </option>
                </select>
              </div>

              {isSuperAdmin && (
                <div>
                  <label
                    htmlFor="new-user-school"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    School
                  </label>

                  <select
                    id="new-user-school"
                    required
                    value={schoolId}
                    onChange={(event) =>
                      setSchoolId(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                  >
                    <option value="">
                      Select a school
                    </option>

                    {activeSchools.map(
                      (school) => (
                        <option
                          key={school.id}
                          value={school.id}
                        >
                          {school.name}
                          {school.code
                            ? ` (${school.code})`
                            : ""}
                        </option>
                      )
                    )}

                  </select>

                  {activeSchools.length === 0 && (
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      There are no active schools.
                      Create or activate a school
                      before adding school users.
                    </p>
                  )}
                </div>
              )}

              {!isSuperAdmin && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  This user will automatically be
                  added to your school.
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                  {success}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    (isSuperAdmin &&
                      activeSchools.length === 0)
                  }
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Creating..."
                    : "Create User"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}
    </>
  );
}