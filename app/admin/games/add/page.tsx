import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AddGameForm from "@/components/AddGameForm";

export default async function AddGamePage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "role, is_active"
    )
    .eq("id", user.id)
    .maybeSingle();

  /*
   * Creating a game currently includes
   * uploading and processing its SCORM
   * ZIP package.
   *
   * Because SCORM package management is
   * restricted to Super Admin, this page
   * must also be Super Admin-only.
   */
  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    profile.role !==
      "super_admin"
  ) {
    redirect("/admin/games");
  }

  const admin =
    createAdminClient();

  const [
    subjectsResult,
    skillsResult,
  ] = await Promise.all([
    admin
      .from("subjects")
      .select(
        `
          id,
          name,
          is_active,
          sort_order
        `
      )
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),

    admin
      .from("skills")
      .select(
        `
          id,
          subject_id,
          name,
          is_active,
          sort_order
        `
      )
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
  ]);

  const subjects =
    subjectsResult.data || [];

  const skills =
    skillsResult.data || [];

  return (
    <main className="min-h-screen bg-[#F4F7FB] p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7">
          <Link
            href="/admin/games"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#667085] transition hover:text-[#6366F1]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>

            Back to Games
          </Link>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6366F1]">
              Content Management
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#172033]">
              Add Game
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
              Add the game artwork,
              choose its subject and
              skill, then upload the
              SCORM ZIP package to
              LearnBoard.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="rounded-2xl border border-[#E3E8F2] bg-white shadow-sm">
            <div className="border-b border-[#E8ECF4] px-6 py-5">
              <h2 className="text-lg font-bold text-[#172033]">
                Game Details
              </h2>

              <p className="mt-1 text-sm text-[#667085]">
                Enter the game
                information, category,
                artwork and SCORM
                package.
              </p>
            </div>

            <div className="p-6">
              <AddGameForm
                subjects={subjects}
                skills={skills}
              />
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-[#E3E8F2] bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#6366F1]">
                <PackageIcon />
              </div>

              <h2 className="mt-4 font-bold text-[#172033]">
                SCORM Package
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#667085]">
                Upload the complete
                game as a ZIP file.
                LearnBoard will
                validate the package
                before it can be used.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E3E8F2] bg-white p-5 shadow-sm">
              <h2 className="font-bold text-[#172033]">
                Package checks
              </h2>

              <div className="mt-4 space-y-3">
                <CheckItem>
                  ZIP package
                </CheckItem>

                <CheckItem>
                  imsmanifest.xml
                </CheckItem>

                <CheckItem>
                  SCORM version
                </CheckItem>

                <CheckItem>
                  Launch file
                </CheckItem>

                <CheckItem>
                  Package size
                </CheckItem>
              </div>
            </div>

            <div className="rounded-2xl border border-[#DDE1FF] bg-[#F7F7FF] p-5">
              <p className="text-sm font-semibold text-[#4F46E5]">
                Game scoring
              </p>

              <p className="mt-2 text-sm leading-6 text-[#667085]">
                LearnBoard will also
                support detailed game
                scoring and student
                attempt tracking.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function CheckItem({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-[#475467]">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-[#6366F1]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
          aria-hidden="true"
        >
          <path d="m5 12 4 4L19 6" />
        </svg>
      </span>

      {children}
    </div>
  );
}

function PackageIcon() {
  return (
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
      <path d="m12 3 8 4-8 4-8-4 8-4Z" />
      <path d="m4 7 8 4 8-4" />
      <path d="M4 7v10l8 4 8-4V7" />
      <path d="M12 11v10" />
    </svg>
  );
}