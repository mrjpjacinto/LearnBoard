import { pageAuth } from "@/lib/lms/auth";
import type { ReactNode } from "react";
import { personalDetails } from "@/lib/lms/personal-details";
import StudentShell from "@/components/StudentShell";
export default async function StudentLayout({children}:{children:ReactNode}) { const { profile, user } = await pageAuth(["student"]); return <StudentShell name={profile.full_name || "Student"} avatar={personalDetails(user.user_metadata?.learnboard_profile).avatar}>{children}</StudentShell>; }
