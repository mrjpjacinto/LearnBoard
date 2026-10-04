"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

type AdminSidebarProps = {
  role: string;
};

export default function AdminSidebar({
  role,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const isSuperAdmin = role === "super_admin";

  const navigation = [
    {
      name: "Dashboard",
      href: "/admin",
      visible: true,
    },
    {
      name: "Schools",
      href: "/admin/schools",
      visible: isSuperAdmin,
    },
    {
      name: "Users",
      href: "/admin/users",
      visible: true,
    },
    {
      name: "Games",
      href: "/admin/games",
      visible: true,
    },
    {
      name: "Learning Paths",
      href: "/admin/paths",
      visible: true,
    },
    {
      name: "Reports",
      href: "/admin/reports",
      visible: true,
    },
    {
      name: "Settings",
      href: "/admin/settings",
      visible: true,
    },
  ];

  return (
    <aside className="flex min-h-screen w-64 flex-col bg-slate-950 p-6 text-white">

      <div className="mb-10">
        <h1 className="text-2xl font-bold">
          LearnBoard
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          {isSuperAdmin
            ? "Super Administrator"
            : "School Administrator"}
        </p>
      </div>

      <nav className="flex-1 space-y-2">

        {navigation
          .filter((item) => item.visible)
          .map((item) => {
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