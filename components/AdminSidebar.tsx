"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

type AdminSidebarProps = {
  role: string;
  fullName: string | null;
  email: string;
};

type NavigationItem = {
  name: string;
  href: string;
  icon:
    | "dashboard"
    | "schools"
    | "users"
    | "subjects"
    | "games"
    | "paths"
    | "reports"
    | "settings";
  superAdminOnly?: boolean;
};

const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: "dashboard",
  },
  {
    name: "Schools",
    href: "/admin/schools",
    icon: "schools",
    superAdminOnly: true,
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: "users",
  },
  {
    name: "Subjects & Skills",
    href: "/admin/subjects",
    icon: "subjects",
  },
  {
    name: "Games",
    href: "/admin/games",
    icon: "games",
  },
  {
    name: "Learning Paths",
    href: "/admin/paths",
    icon: "paths",
  },
  {
    name: "Reports",
    href: "/admin/reports",
    icon: "reports",
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: "settings",
  },
];

export default function AdminSidebar({
  role,
  fullName,
  email,
}: AdminSidebarProps) {
  const pathname =
    usePathname();

  const isSuperAdmin =
    role === "super_admin";

  const displayName =
    fullName?.trim() ||
    email ||
    "Administrator";

  const roleLabel =
    isSuperAdmin
      ? "Super Admin"
      : "School Admin";

  const initials =
    getInitials(displayName);

  const visibleNavigation =
    navigation.filter(
      (item) =>
        !item.superAdminOnly ||
        isSuperAdmin
    );

  return (
    <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col bg-[#0F172A]">

      <div className="flex h-[82px] items-center border-b border-white/[0.06] px-6">

        <Link
          href="/admin"
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6366F1] text-lg font-bold text-white shadow-sm">
            L
          </div>

          <div>
            <p className="text-[17px] font-bold tracking-tight text-white">
              LearnBoard
            </p>

            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#7F93B5]">
              LMS
            </p>
          </div>
        </Link>

      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5">

        <div className="space-y-1">

          {visibleNavigation.map(
            (item) => {
              const active =
                isNavigationActive(
                  pathname,
                  item.href
                );

              return (
                <Link
                  key={
                    item.href
                  }
                  href={
                    item.href
                  }
                  className={`group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                    active
                      ? "bg-[#263248] text-white"
                      : "text-[#B8C7E0] hover:bg-[#1E293B] hover:text-white"
                  }`}
                >
                  {active && (
                    <span className="absolute -left-3 top-2.5 h-6 w-1 rounded-r-full bg-[#6366F1]" />
                  )}

                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                      active
                        ? "text-[#A5B4FC]"
                        : "text-[#8FA6CC] group-hover:text-[#B8C7E0]"
                    }`}
                  >
                    <NavigationIcon
                      icon={
                        item.icon
                      }
                    />
                  </span>

                  <span>
                    {item.name}
                  </span>
                </Link>
              );
            }
          )}

        </div>

      </nav>

      <div className="border-t border-white/[0.06] p-4">

        <div className="flex items-center gap-3 rounded-xl px-2 py-2">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#263248] text-xs font-bold uppercase text-[#C7D2FE]">
            {initials}
          </div>

          <div className="min-w-0 flex-1">

            <p className="truncate text-sm font-semibold text-white">
              {displayName}
            </p>

            <p className="mt-0.5 truncate text-xs text-[#7F93B5]">
              {roleLabel}
            </p>

          </div>

          <LogoutButton
            iconOnly
          />

        </div>

      </div>

    </aside>
  );
}

function isNavigationActive(
  pathname: string,
  href: string
) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return (
    pathname === href ||
    pathname.startsWith(
      `${href}/`
    )
  );
}

function getInitials(
  value: string
) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return "A";
  }

  if (
    parts.length === 1
  ) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${
    parts[
      parts.length - 1
    ][0]
  }`.toUpperCase();
}

function NavigationIcon({
  icon,
}: {
  icon: NavigationItem["icon"];
}) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap:
      "round" as const,
    strokeLinejoin:
      "round" as const,
    className: "h-5 w-5",
    "aria-hidden":
      true as const,
  };

  if (
    icon === "dashboard"
  ) {
    return (
      <svg {...commonProps}>
        <rect
          x="3"
          y="3"
          width="7"
          height="7"
          rx="1.5"
        />
        <rect
          x="14"
          y="3"
          width="7"
          height="7"
          rx="1.5"
        />
        <rect
          x="3"
          y="14"
          width="7"
          height="7"
          rx="1.5"
        />
        <rect
          x="14"
          y="14"
          width="7"
          height="7"
          rx="1.5"
        />
      </svg>
    );
  }

  if (
    icon === "schools"
  ) {
    return (
      <svg {...commonProps}>
        <path d="m3 10 9-6 9 6" />
        <path d="M5 9v10" />
        <path d="M19 9v10" />
        <path d="M9 19v-5h6v5" />
        <path d="M3 19h18" />
      </svg>
    );
  }

  if (
    icon === "users"
  ) {
    return (
      <svg {...commonProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle
          cx="9"
          cy="7"
          r="4"
        />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if (
    icon === "subjects"
  ) {
    return (
      <svg {...commonProps}>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z" />
        <path d="M7 7h2" />
        <path d="M15 7h2" />
        <path d="M7 10h2" />
        <path d="M15 10h2" />
      </svg>
    );
  }

  if (
    icon === "games"
  ) {
    return (
      <svg {...commonProps}>
        <path d="M8 9h8a5 5 0 0 1 4.8 6.4l-.7 2.2a2 2 0 0 1-3.3.8L14.4 16H9.6l-2.4 2.4a2 2 0 0 1-3.3-.8l-.7-2.2A5 5 0 0 1 8 9Z" />
        <path d="M8 13h3" />
        <path d="M9.5 11.5v3" />
        <path d="M16 12.5h.01" />
        <path d="M18 14.5h.01" />
      </svg>
    );
  }

  if (
    icon === "paths"
  ) {
    return (
      <svg {...commonProps}>
        <circle
          cx="6"
          cy="18"
          r="2"
        />
        <circle
          cx="18"
          cy="6"
          r="2"
        />
        <path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3h-1" />
      </svg>
    );
  }

  if (
    icon === "reports"
  ) {
    return (
      <svg {...commonProps}>
        <path d="M4 20V10" />
        <path d="M10 20V4" />
        <path d="M16 20v-7" />
        <path d="M22 20H2" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <circle
        cx="12"
        cy="12"
        r="3"
      />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.14.37.36.7.64.96.3.28.69.44 1.1.44H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}