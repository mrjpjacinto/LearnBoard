"use client";

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
        "Your LearnBoard profile could not be found."
      );

      setLoading(false);
      return;
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();

      setError(
        "This LearnBoard account is inactive."
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
            <div className="text-3xl font-bold">
              LearnBoard
            </div>

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
            LearnBoard Learning Management System
          </p>

        </section>

        {/* LOGIN SIDE */}
        <section className="flex min-h-[650px] items-center p-8 md:p-14">

          <div className="w-full">

            <div className="mb-10 md:hidden">

              <div className="text-3xl font-bold text-slate-900">
                LearnBoard
              </div>

              <p className="text-slate-500">
                eLearning Platform
              </p>

            </div>

            <h2 className="text-3xl font-bold text-slate-900">
              Welcome back
            </h2>

            <p className="mt-2 text-slate-500">
              Sign in to continue to LearnBoard.
            </p>

            {/* ROLE SELECTOR */}
            <div className="mt-8 grid grid-cols-2 rounded-xl bg-slate-100 p-1">

              <button
                type="button"
                onClick={() => {
                  setRole("admin");
                  setError("");
                }}
                className={`rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  role === "admin"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Administrator
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole("student");
                  setError("");
                }}
                className={`rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  role === "student"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500"
                  >
                    {showPassword
                      ? "Hide"
                      : "Show"}
                  </button>

                </div>
              </div>

              {/* ERROR MESSAGE */}
              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Signing in..."
                  : role === "admin"
                    ? "Login as Administrator"
                    : "Login as Student"}
              </button>

            </form>

            <p className="mt-8 text-center text-xs text-slate-400">
              Secure access powered by LearnBoard
            </p>

          </div>
        </section>

      </div>
    </main>
  );
}