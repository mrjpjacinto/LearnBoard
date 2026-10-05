import { NextResponse } from "next/server";
import { apiError } from "@/lib/lms/auth";
import { reportAttempt } from "@/lib/lms/reports";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json(await reportAttempt(id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
