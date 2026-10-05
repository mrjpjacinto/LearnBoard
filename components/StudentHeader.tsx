"use client";
import { profileInitials } from "@/lib/lms/initials";
import BrandIcon from "./BrandIcon";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";
import ActionIcon from "./ActionIcon";
export default function StudentHeader({ name, avatar }: { name: string; avatar?: string }) {
  const pathname = usePathname();
  return <header className="border-b border-[#E3E8F2] bg-white text-[#172033]">
    <div className="grid w-full grid-cols-[1fr_auto] items-center gap-4 px-6 py-4 lg:px-8 md:grid-cols-[1fr_auto_1fr]">
      <nav aria-label="Student navigation" className="order-3 col-span-2 flex justify-center gap-2 overflow-x-auto md:order-2 md:col-span-1">
        {[["/student", "My Learning"], ["/student/progress", "My Progress"], ["/student/scores", "My Scores"]].map(([href, label]) => {
          const active = pathname === href || (href === "/student" && pathname.startsWith("/student/learning/"));
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold ${active ? "bg-[#EEF0FF] text-[#4F46E5]" : "text-[#667085] hover:bg-[#F4F7FB]"}`}>{label}</Link>;
        })}
      </nav>
      <Link href="/student" className="order-1 flex shrink-0 items-center gap-3" aria-label="LumenTrail My Learning">
        <BrandIcon /><span className="text-lg font-bold">LumenTrail<span className="block text-xs font-normal text-[#667085]">Path to Growth</span></span>
      </Link>
      <details className="relative order-2 justify-self-end shrink-0 md:order-3">
        <summary aria-label="Open profile menu" className="flex h-[54px] w-[54px] p-[5px] cursor-pointer list-none items-center justify-center overflow-hidden rounded-full border border-[#E3E8F2] bg-[#F4F5FF] text-[#6366F1] transition hover:border-[#C7D2FE] hover:bg-[#EEF0FF] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6366F1] [&::-webkit-details-marker]:hidden">
          {avatar ? <img src={avatar} alt="Your profile" className="h-11 w-11 rounded-full object-cover" /> : <span className="text-sm font-semibold">{profileInitials(name)}</span>}        </summary>
        <div className="absolute right-0 z-50 mt-3 w-64 max-w-[calc(100vw-3rem)] overflow-hidden rounded-xl border border-[#E3E8F2] bg-white text-[#172033] shadow-[0_8px_30px_rgba(16,24,40,0.12)]">
          <div className="flex items-center gap-3 border-b border-[#EEF0F4] px-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EEF0FF] text-sm font-semibold text-[#6366F1]" aria-hidden="true">{avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : profileInitials(name)}</span>
            <div className="min-w-0"><p className="break-words text-sm font-semibold">{name}</p><p className="mt-0.5 text-xs text-[#667085]">Student account</p></div>
          </div>
          <div className="space-y-1 p-2">
            <Link href="/student/settings" onClick={e => e.currentTarget.closest("details")?.removeAttribute("open")} className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#475467] transition hover:bg-[#F4F7FB] hover:text-[#172033]"><ActionIcon name="edit" />Edit Profile</Link>
            <LogoutButton menu />
          </div>
        </div>
      </details>
    </div>
  </header>;
}
