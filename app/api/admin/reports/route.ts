import { NextResponse } from "next/server";
import { apiError } from "@/lib/lms/auth";
import { reportData } from "@/lib/lms/reports";
export async function GET(request: Request) { try { return NextResponse.json(await reportData(new URL(request.url).searchParams)); } catch(e) { return apiError(e); } }
