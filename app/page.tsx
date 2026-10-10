"use client";
import { Notification, showToast } from "@/components/LmsToast";
import ActionIcon from "@/components/ActionIcon";


import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LoginRole = "admin" | "student";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<LoginRole>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError || !data.user) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role, is_active, school_id")
        .eq("id", data.user.id)
        .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();

      setError(
        "Your LumenTrail profile could not be found."
      );

      setLoading(false);
      return;
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();

      setError(
        "This LumenTrail account is inactive."
      );

      setLoading(false);
      return;
    }

    const isAdministrator =
      profile.role === "admin" ||
      profile.role === "super_admin";

    const isStudent =
      profile.role === "student";

    /*
     * Administrator login accepts:
     * - Super Admin
     * - School Admin / Teacher
     */
    if (role === "admin" && !isAdministrator) {
      await supabase.auth.signOut();

      setError(
        "This account does not have Administrator access."
      );

      setLoading(false);
      return;
    }

    /*
     * Student login accepts only students.
     */
    if (role === "student" && !isStudent) {
      await supabase.auth.signOut();

      setError(
        "This account does not have Student access."
      );

      setLoading(false);
      return;
    }

    /*
     * School administrators and students must eventually
     * belong to a school.
     *
     * We are temporarily allowing NULL school_id while the
     * multi-school migration is being completed.
     *
     * Super Admin deliberately has no school_id.
     */

    showToast({ type: "success", message: "Signed in successfully." });
    if (isAdministrator) {
      router.push("/admin");
    } else {
      router.push("/student");
    }

    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">

        {/* LEFT SIDE */}
        <section className="hidden min-h-[650px] flex-col justify-between bg-slate-900 p-12 text-white md:flex">

          <div>
            <div className="text-3xl font-bold">LumenTrail</div>

            <p className="mt-2 text-slate-300">
              eLearning Platform
            </p>
          </div>

          <div>
            <h1 className="text-4xl font-semibold leading-tight">
              Learn. Play.
              <br />
              Grow.
            </h1>

            <p className="mt-5 max-w-sm leading-7 text-slate-300">
              Interactive learning experiences, SCORM games,
              learning paths and progress tracking in one place.
            </p>
          </div>

          <p className="text-sm text-slate-400">
            LumenTrail Learning Management System
          </p>

        </section>

        {/* LOGIN SIDE */}
        <section className="flex min-h-[650px] items-center p-8 md:p-14">

          <div className="w-full">

            <div className="mb-10 md:hidden">

              <div className="text-3xl font-bold text-slate-900">LumenTrail</div>

              <p className="text-slate-500">
                eLearning Platform
              </p>

            </div>

            <h2 className="text-3xl font-bold text-slate-900">
              Welcome back
            </h2>

            <p className="mt-2 text-slate-500">
              Sign in to continue to LumenTrail.
            </p>

            {/* ROLE SELECTOR */}
            <div className="mt-8 grid grid-cols-2 rounded-xl bg-slate-100 p-1">

              <button
                type="button"
                onClick={() => {
                  setRole("admin");
                  setError("");
                }}
                className={("inline-flex items-center gap-2 " + (`inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  role === "admin"
                    ? "bg-[#EEF0FF] text-[#4F46E5] shadow-sm"
                    : "text-[#4F46E5]"
                }`))}
              ><ActionIcon name="school" className="inline-block h-4 w-4 shrink-0 align-middle mr-2" />
                Administrator
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole("student");
                  setError("");
                }}
                className={("inline-flex items-center gap-2 " + (`rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  role === "student"
                    ? "bg-[#EEF0FF] text-[#4F46E5] shadow-sm"
                    : "text-[#4F46E5]"
                }`))}
              ><ActionIcon name="users" className="inline-block h-4 w-4 shrink-0 align-middle mr-2" />
                Student
              </button>

            </div>

            {/* LOGIN FORM */}
            <form
              onSubmit={handleLogin}
              className="mt-8 space-y-5"
            >

              <div>

                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                />

              </div>

              <div>

                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>

                <div className="relative">

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-20 text-slate-900 outline-none transition focus:border-slate-900"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    className="inline-flex items-center gap-2 absolute right-4 top-1/2 inline-flex -translate-y-1/2 items-center rounded-lg bg-[#EEF0FF] px-2 py-1 text-sm font-medium text-[#4F46E5] hover:bg-[#E0E4FF]"
                  ><ActionIcon name="view" className="inline-block h-4 w-4 shrink-0 align-middle mr-2" />
                    {showPassword
                      ? "Hide"
                      : "Show"}
                  </button>

                </div>
              </div>

              {/* ERROR MESSAGE */}
              {error && (
                <Notification type="error" message={error} onClose={() => setError("")} />
              )}

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 inline-flex w-full items-center justify-center rounded-xl bg-[#6366F1] px-4 py-3 font-semibold text-white transition hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
              ><ActionIcon name="key" className="inline-block h-4 w-4 shrink-0 align-middle mr-2" />
                {loading
                  ? "Signing in..."
                  : role === "admin"
                    ? "Login as Administrator"
                    : "Login as Student"}
              </button>

            </form>

            <p className="mt-8 text-center text-xs text-slate-400">
              Secure access powered by LumenTrail
            </p>

          </div>
        </section>

      </div>
    </main>
  );
}