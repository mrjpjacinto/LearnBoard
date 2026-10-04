import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "You are not authenticated." },
        { status: 401 }
      );
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", currentUser.id)
      .single();

    if (
      !currentProfile ||
      currentProfile.role !== "admin" ||
      !currentProfile.is_active
    ) {
      return NextResponse.json(
        { error: "Administrator access is required." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim()
        : "";

    const role =
      body.role === "admin" ? "admin" : "student";

    const isActive = body.isActive === true;

    if (!fullName) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 }
      );
    }

    // Protect the currently logged-in administrator.
    if (id === currentUser.id) {
      if (role !== "admin") {
        return NextResponse.json(
          {
            error:
              "You cannot remove your own Administrator role.",
          },
          { status: 400 }
        );
      }

      if (!isActive) {
        return NextResponse.json(
          {
            error:
              "You cannot deactivate your own account.",
          },
          { status: 400 }
        );
      }
    }

    const adminSupabase = createAdminClient();

    const { data: targetUser, error: targetError } =
      await adminSupabase
        .from("profiles")
        .select("id")
        .eq("id", id)
        .single();

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const { error: updateError } = await adminSupabase
      .from("profiles")
      .update({
        full_name: fullName,
        role,
        is_active: isActive,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}