import { pageAuth } from "@/lib/lms/auth";
import type { ReactNode } from "react";
export default async function StudentLayout({children}:{children:ReactNode}) { await pageAuth(["student"]); return children; }
