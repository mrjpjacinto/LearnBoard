import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    // Check who is making the request.
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You are not authenticated." },
        { status: 401 }
      );
    }

    // Confirm the logged-in user is an active administrator.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      profile.role !== "admin" ||
      !profile.is_active
    ) {
      return NextResponse.json(
        { error: "Administrator access is required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const role =
      body.role === "admin" ? "admin" : "student";

    if (!fullName) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Create the actual Supabase Auth user.
    const { data: createdUser, error: createError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

    if (createError || !createdUser.user) {
      return NextResponse.json(
        {
          error:
            createError?.message ||
            "Unable to create user.",
        },
        { status: 400 }
      );
    }

    // Our auth trigger creates the profile.
    // Update it with the administrator's selected values.
    const { error: profileError } = await adminSupabase
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        role,
        is_active: true,
      })
      .eq("id", createdUser.user.id);

    if (profileError) {
      // Avoid leaving behind an incomplete Auth user.
      await adminSupabase.auth.admin.deleteUser(
        createdUser.user.id
      );

      return NextResponse.json(
        {
          error:
            "The authentication account was created, but the LearnBoard profile could not be created.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: createdUser.user.id,
        fullName,
        email,
        role,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}