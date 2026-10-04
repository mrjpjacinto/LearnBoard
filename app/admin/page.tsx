import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
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

  if (!profile || !profile.is_active || profile.role !== "admin") {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-slate-900 p-10 text-white">
	<p className="text-sm font-medium text-slate-300">
  		Administrator Portal
	</p>

          <h1 className="mt-2 text-4xl font-bold">
            Welcome to LearnBoard
          </h1>

          <p className="mt-3 text-slate-300">
            Signed in as {profile.full_name || profile.email}
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <DashboardCard title="Students" value="0" />
          <DashboardCard title="Games" value="0" />
          <DashboardCard title="Learning Boards" value="0" />
        </div>

        <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">
            Administrator Dashboard
          </h2>

          <p className="mt-3 text-slate-600">
            Your LearnBoard administration system is connected and ready
            for the next stage.
          </p>
        </div>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-7 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-4xl font-bold text-slate-900">{value}</p>
    </div>
  );
}