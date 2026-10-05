import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
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

    /*
     * Determine who is making the request.
     */
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active, school_id")
      .eq("id", user.id)
      .single();

    const isSuperAdmin =
      profile?.role === "super_admin";

    const isSchoolAdmin =
      profile?.role === "admin";

    if (
      !profile ||
      !profile.is_active ||
      (!isSuperAdmin && !isSchoolAdmin)
    ) {
      return NextResponse.json(
        {
          error:
            "Administrator access is required.",
        },
        { status: 403 }
      );
    }

    /*
     * A School Admin must belong to a school.
     */
    if (
      isSchoolAdmin &&
      !profile.school_id
    ) {
      return NextResponse.json(
        {
          error:
            "Your administrator account is not assigned to a school.",
        },
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

    /*
     * Only these roles can be created here.
     *
     * Never accept super_admin from the browser.
     */
    const role =
      body.role === "admin"
        ? "admin"
        : "student";

    const requestedSchoolId =
      typeof body.schoolId === "string"
        ? body.schoolId.trim()
        : "";

    if (!fullName) {
      return NextResponse.json(
        {
          error:
            "Full name is required.",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          error:
            "Email is required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    const adminSupabase =
      createAdminClient();

    /*
     * Decide the destination school on the server.
     *
     * Super Admin:
     * Uses the selected school.
     *
     * School Admin:
     * Browser choice is ignored completely.
     * Their own school is always used.
     */
    let destinationSchoolId: string;

    if (isSuperAdmin) {
      if (!requestedSchoolId) {
        return NextResponse.json(
          {
            error:
              "Please select a school.",
          },
          { status: 400 }
        );
      }

      destinationSchoolId =
        requestedSchoolId;
    } else {
      destinationSchoolId =
        profile.school_id as string;
    }

    /*
     * Verify that the destination school
     * really exists and is active.
     */
    const {
      data: destinationSchool,
      error: schoolError,
    } = await adminSupabase
      .from("schools")
      .select("id, name, is_active")
      .eq("id", destinationSchoolId)
      .maybeSingle();

    if (schoolError) {
      console.error(
        "School lookup error:",
        schoolError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify the selected school.",
        },
        { status: 500 }
      );
    }

    if (!destinationSchool) {
      return NextResponse.json(
        {
          error:
            "The selected school does not exist.",
        },
        { status: 400 }
      );
    }

    if (!destinationSchool.is_active) {
      return NextResponse.json(
        {
          error:
            "Users cannot be added to an inactive school.",
        },
        { status: 400 }
      );
    }

    /*
     * Create the Supabase Auth account.
     */
    const {
      data: createdUser,
      error: createError,
    } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

    if (
      createError ||
      !createdUser.user
    ) {
      return NextResponse.json(
        {
          error:
            createError?.message ||
            "Unable to create user.",
        },
        { status: 400 }
      );
    }

    /*
     * The auth trigger creates the profile.
     * Update that profile with LumenTrail's
     * role and school information.
     */
    const { error: profileError } =
      await adminSupabase
        .from("profiles")
        .update({
          full_name: fullName,
          email,
          role,
          school_id:
            destinationSchoolId,
          is_active: true,
        })
        .eq(
          "id",
          createdUser.user.id
        );

    if (profileError) {
      /*
       * Avoid leaving an incomplete
       * authentication account behind.
       */
      await adminSupabase.auth.admin.deleteUser(
        createdUser.user.id
      );

      console.error(
        "Profile update error:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "The authentication account was created, but the LumenTrail profile could not be created.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,

        user: {
          id: createdUser.user.id,
          fullName,
          email,
          role,
          schoolId:
            destinationSchoolId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Create user API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "An unexpected server error occurred.",
      },
      { status: 500 }
    );
  }
}