"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

const navigation = [
  { name: "Dashboard", href: "/admin" },
  { name: "Users", href: "/admin/users" },
  { name: "Games", href: "/admin/games" },
  { name: "Learning Boards", href: "/admin/boards" },
  { name: "Results", href: "/admin/results" },
  { name: "Settings", href: "/admin/settings" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-64 flex-col bg-slate-950 p-6 text-white">

      <div className="mb-10">
        <h1 className="text-2xl font-bold">
          LearnBoard
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Administrator Portal
        </p>
      </div>

      <nav className="flex-1 space-y-2">

        {navigation.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-white text-slate-950"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.name}
            </Link>
          );
        })}

      </nav>

      <div className="border-t border-white/10 pt-5">
        <LogoutButton />
      </div>

    </aside>
  );
}