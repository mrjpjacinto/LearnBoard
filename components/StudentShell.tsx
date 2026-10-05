"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import StudentHeader from "./StudentHeader";
export default function StudentShell({name,avatar,children}:{name:string;avatar:string;children:ReactNode}) {
  const playing = usePathname().startsWith("/student/play/");
  return <div className="student-portal min-h-screen bg-[#F4F7FB] text-[#172033]">{!playing && <StudentHeader name={name} avatar={avatar} />}<main id="student-content">{children}</main></div>;
}
