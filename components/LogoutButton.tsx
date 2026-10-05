"use client";
import ActionIcon from "@/components/ActionIcon";


import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LogoutButtonProps = {
  iconOnly?: boolean;
  light?: boolean;
  menu?: boolean;
};

export default function LogoutButton({
  iconOnly = false,
  light = false,
  menu = false,
}: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.push("/");
    router.refresh();
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        title="Log Out"
        aria-label="Log Out"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#8FA6CC] transition hover:bg-[#263248] hover:text-white"
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
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M14 3h4a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-4" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={menu ? "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#475467] transition hover:bg-[#F4F7FB] hover:text-[#172033]" : `inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${light ? "border border-[#D8DEEA] bg-white text-[#344054] hover:bg-[#EEF0FF]" : "bg-white/10 text-white hover:bg-white/20"}`}
    ><ActionIcon name="logout" />
      Log Out
    </button>
  );
}
