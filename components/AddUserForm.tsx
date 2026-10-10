"use client";
import { Notification } from "./LmsToast";
import { showToast } from "./LmsToast";
import ActionIcon from "@/components/ActionIcon";
import { addButtonClass } from "@/lib/ui/buttons";


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

type AddUserFormProps = {
  isSuperAdmin: boolean;
  schools: School[];
};

export default function AddUserForm({
  isSuperAdmin,
  schools,
}: AddUserFormProps) {
  const router = useRouter();

  const [open, setOpen] =
    useState(false);

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [role, setRole] =
    useState<"student" | "admin">(
      "student"
    );

  const [schoolId, setSchoolId] = useState(!isSuperAdmin && schools.filter(s => s.is_active).length === 1 ? schools.find(s => s.is_active)!.id : "");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const activeSchools =
    schools.filter(
      (school) =>
        school.is_active
    );

  function resetForm() {
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("student");

    if (
      !isSuperAdmin &&
      activeSchools.length === 1
    ) {
      setSchoolId(
        activeSchools[0].id
      );
    } else {
      setSchoolId("");
    }

    setError("");
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setOpen(false);
    resetForm();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanName =
      fullName.trim();

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (!cleanName) {
      setError(
        "Full name is required."
      );

      return;
    }

    if (!cleanEmail) {
      setError(
        "Email is required."
      );

      return;
    }

    if (
      password.length < 8
    ) {
      setError(
        "Password must be at least 8 characters."
      );

      return;
    }

    if (
      isSuperAdmin &&
      !schoolId
    ) {
      setError(
        "Please select a school."
      );

      return;
    }

    setSaving(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/users",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              fullName:
                cleanName,
              email:
                cleanEmail,
              password,
              role,
              schoolId:
                schoolId ||
                undefined,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Unable to create user."
        );

        return;
      }

      resetForm();
      setOpen(false);

      showToast({ type: "success", message: "User created." });

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
        Add User
      </PrimaryAddButton>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={event => { if (event.target === event.currentTarget) { closeModal(); } }}>

          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white text-slate-900 shadow-xl">

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E3E8F2] bg-white px-6 py-5">

              <div>
                <p className="text-xs font-semibold tracking-wide text-[#6366F1]">
                  USER MANAGEMENT
                </p>

                <h2 className="mt-1 text-xl font-bold text-[#172033]">
                  Add User
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create a new administrator or student account.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={saving}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4F46E5] transition hover:bg-slate-100 disabled:opacity-50 !border-red-200 !bg-red-50 !text-red-700 hover:!bg-red-100 focus-visible:!outline-red-500 focus:!ring-red-200"
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
                  <path stroke="#DC2626" d="M18 6 6 18" />
                  <path stroke="#DC2626" d="m6 6 12 12" />
                </svg>
              </button>

            </div>

            <form
              onSubmit={
                handleSubmit
              }
            >

              <div className="stack-layout p-6">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Full Name
                  </label>

                  <input
                    type="text"
                    value={fullName}
                    onChange={(
                      event
                    ) =>
                      setFullName(
                        event.target
                          .value
                      )
                    }
                    autoFocus
                    placeholder="Enter full name"
                    className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-[#818CF8]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(
                      event
                    ) =>
                      setEmail(
                        event.target
                          .value
                      )
                    }
                    placeholder="student@school.com"
                    className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-[#818CF8]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Temporary Password
                  </label>

                  <input
                    type="password"
                    value={password}
                    minLength={8}
                    onChange={(
                      event
                    ) =>
                      setPassword(
                        event.target
                          .value
                      )
                    }
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-[#818CF8]"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    The password must contain at least 8 characters.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Role
                  </label>

                  <select
                    value={role}
                    onChange={(
                      event
                    ) =>
                      setRole(
                        event.target
                          .value as
                          | "student"
                          | "admin"
                      )
                    }
                    className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 outline-none transition focus:border-[#818CF8]"
                  >
                    <option value="student">
                      Student
                    </option>

                    <option value="admin">
                      School Administrator
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    School
                  </label>

                  {isSuperAdmin ? (
                    <select
                      value={
                        schoolId
                      }
                      onChange={(
                        event
                      ) =>
                        setSchoolId(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 outline-none transition focus:border-[#818CF8]"
                    >
                      <option value="">
                        Select a school
                      </option>

                      {activeSchools.map(
                        (
                          school
                        ) => (
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
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600">
                      {activeSchools[0]
                        ? activeSchools[0]
                            .code
                          ? `${activeSchools[0].name} (${activeSchools[0].code})`
                          : activeSchools[0]
                              .name
                        : "No school assigned"}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-slate-500">
                    {isSuperAdmin
                      ? "Select the school this user belongs to."
                      : "Users you create are automatically assigned to your school."}
                  </p>
                </div>

                {error && (
                  <Notification type="error" message={error} onClose={() => setError("")} />
                )}

              </div>

              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#E3E8F2] bg-[#FAFBFD] px-6 py-4">

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8DEEA] bg-[#EEF0FF] px-5 py-2.5 text-sm font-semibold text-[#4F46E5] transition hover:bg-[#E0E4FF] disabled:opacity-50 !border-red-200 !bg-red-50 !text-red-700 hover:!bg-red-100 focus-visible:!outline-red-500 focus:!ring-red-200"
                ><ActionIcon name="close" />
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className={addButtonClass}
                >
                  {!saving && (
                    <PlusIcon />
                  )}

                  {saving
                    ? "Adding..."
                    : "Add User"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}
    </>
  );
}

function PlusIcon() { return <ActionIcon name="add" />; }