"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

type AdminSidebarProps = {
  role: string;
  fullName: string | null;
  email: string;
};

type IconProps = {
  className?: string;
};

function DashboardIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function SchoolIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 21h18" />
      <path d="M5 21V9l7-4 7 4v12" />
      <path d="M9 21v-6h6v6" />
      <path d="M8 11h2" />
      <path d="M14 11h2" />
    </svg>
  );
}

function UsersIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function GamesIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 8h12a4 4 0 0 1 3.8 5.3l-1.2 3.5a2.5 2.5 0 0 1-4.2.9L14.8 16H9.2l-1.6 1.7a2.5 2.5 0 0 1-4.2-.9l-1.2-3.5A4 4 0 0 1 6 8Z" />
      <path d="M7 12v4" />
      <path d="M5 14h4" />
      <circle cx="17" cy="13" r=".7" fill="currentColor" />
      <circle cx="19" cy="15" r=".7" fill="currentColor" />
    </svg>
  );
}

function PathIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="6" cy="5" r="2" />
      <circle cx="18" cy="19" r="2" />
      <path d="M6 7v4a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3" />
    </svg>
  );
}

function ReportsIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  );
}

function SettingsIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.5 1a7 7 0 0 0-1.8-1L14.3 3h-4.1L9.8 6a7 7 0 0 0-1.8 1L5.5 6 3.5 9.5 5.5 11a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.5-1a7 7 0 0 0 1.8 1l.4 3h4.1l.4-3a7 7 0 0 0 1.8-1l2.5 1 2-3.5-2-1.5a7 7 0 0 0 .1-1Z" />
    </svg>
  );
}

export default function AdminSidebar({
  role,
  fullName,
  email,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const isSuperAdmin = role === "super_admin";

  const navigation = [
    {
      name: "Dashboard",
      href: "/admin",
      visible: true,
      icon: DashboardIcon,
    },
    {
      name: "Schools",
      href: "/admin/schools",
      visible: isSuperAdmin,
      icon: SchoolIcon,
    },
    {
      name: "Users",
      href: "/admin/users",
      visible: true,
      icon: UsersIcon,
    },
    {
      name: "Games",
      href: "/admin/games",
      visible: true,
      icon: GamesIcon,
    },
    {
      name: "Learning Paths",
      href: "/admin/paths",
      visible: true,
      icon: PathIcon,
    },
    {
      name: "Reports",
      href: "/admin/reports",
      visible: true,
      icon: ReportsIcon,
    },
    {
      name: "Settings",
      href: "/admin/settings",
      visible: true,
      icon: SettingsIcon,
    },
  ];

  const displayName =
    fullName?.trim() ||
    email ||
    "Administrator";

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "A";

  const roleLabel = isSuperAdmin
    ? "Super Administrator"
    : "School Administrator";

  return (
    <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col bg-[#0F172A] px-5 py-6 text-white">
      {/* Brand */}
      <div className="mb-9 flex items-center gap-3 px-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6366F1] text-xl font-bold text-white shadow-lg shadow-indigo-950/20">
          L
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            LearnBoard
          </h1>

          <p className="text-sm text-[#94A3B8]">
            LMS
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5">
        {navigation
          .filter((item) => item.visible)
          .map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl border-l-4 px-3 py-3.5 text-[15px] font-medium transition-all ${
                  active
                    ? "border-[#818CF8] bg-[#263248] text-white"
                    : "border-transparent text-[#B8C7E0] hover:bg-[#1E293B] hover:text-white"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${
                    active
                      ? "text-[#A5B4FC]"
                      : "text-[#8FB5F5] group-hover:text-[#A5B4FC]"
                  }`}
                />

                <span>{item.name}</span>
              </Link>
            );
          })}
      </nav>

      {/* Account */}
      <div className="border-t border-[#29364D] pt-5">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          {/* Avatar */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#334155] text-sm font-bold text-white">
            {initials}
          </div>

          {/* User information */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {displayName}
            </p>

            <p className="truncate text-xs text-[#8FA6CC]">
              {roleLabel}
            </p>
          </div>

          {/* Logout icon */}
          <LogoutButton iconOnly />
        </div>
      </div>
    </aside>
  );
}