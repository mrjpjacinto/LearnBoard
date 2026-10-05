import Link from "next/link";
import type { ReactNode } from "react";
import ActionIcon from "./ActionIcon";
import { addButtonClass } from "@/lib/ui/buttons";
export default function PrimaryAddLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return <Link href={href} className={`${addButtonClass} ${className}`}><ActionIcon name="add" />{children}</Link>;
}
