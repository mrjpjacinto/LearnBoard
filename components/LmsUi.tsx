import ActionIcon from "@/components/ActionIcon";
import Link from "next/link";
import type { ReactNode } from "react";
export const inputClass = "w-full rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 text-sm text-[#172033] outline-none focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10 disabled:opacity-60";
export const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#D8DEEA] bg-white px-4 py-2 text-sm font-semibold text-[#475467] transition hover:bg-[#F5F5FF] disabled:opacity-50";
export function Workspace({ title, description, children, back, actions }: { title: string; description: string; children: ReactNode; back?: { href: string; label: string }; actions?: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">{back && <Link href={back.href} className="inline-flex items-center gap-2 text-sm font-medium text-[#6366F1] hover:underline"><ActionIcon name="back" />{back.label}</Link>}<div className="mb-layout mt-3 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight text-[#172033] break-words">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">{description}</p></div>{actions}</div>{children}</div>;
}
export function Card({ children, className = "", compact = false }: { children: ReactNode; className?: string; compact?: boolean }) { return <section className={`rounded-2xl border border-[#E3E8F2] bg-white ${compact ? "px-5 py-3" : "p-5"} shadow-sm ${className}`}>{children}</section>; }
export function Empty({ title, children }: { title: string; children?: ReactNode }) { return <Card className="py-12 text-center"><h2 className="font-semibold text-[#172033]">{title}</h2><div className="mt-2 text-sm text-[#667085]">{children}</div></Card>; }
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-semibold text-[#344054]">{label}</span>{children}</label>; }
export function Badge({ children }: { children: ReactNode }) { return <span className="inline-flex rounded-full bg-[#EEF0FF] px-3 py-1 text-xs font-semibold text-[#4F46E5]">{children}</span>; }
