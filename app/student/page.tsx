import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export default async function StudentPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active || profile.role !== "student") {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl bg-slate-900 p-10 text-white">
	<div className="flex items-center justify-between">
	 	<p className="text-sm font-medium text-slate-300">
  			 Student Portal
  		</p>

  		<LogoutButton />
	</div>

          <h1 className="mt-2 text-4xl font-bold">
            Welcome to LearnBoard
          </h1>

          <p className="mt-3 text-slate-300">
            Signed in as {profile.full_name || profile.email}
          </p>
        </div>

        <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">
            My Learning
          </h2>

          <p className="mt-3 text-slate-600">
            Your assigned Learning Boards and SCORM games will appear here.
          </p>
        </div>
      </div>
    </main>
  );
}