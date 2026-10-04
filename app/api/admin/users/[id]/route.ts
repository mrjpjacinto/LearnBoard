import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/*
 * PATCH
 *
 * Edit:
 * - Full name
 * - Student / School Administrator role
 * - Active / Inactive status
 *
 * Security:
 * - Super Admin can manage school users across schools.
 * - School Admin can manage only users in their own school.
 * - School Admin can never manage a Super Admin.
 * - This endpoint never promotes anyone to Super Admin.
 * - A Super Admin cannot demote or deactivate themselves here.
 */
export async function PATCH(
  request: Request,
  context: RouteContext
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
      .select("role, is_active, school_id")
      .eq("id", currentUser.id)
      .single();

    const isSuperAdmin =
      currentProfile?.role === "super_admin";

    const isSchoolAdmin =
      currentProfile?.role === "admin";

    if (
      !currentProfile ||
      !currentProfile.is_active ||
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

    if (
      isSchoolAdmin &&
      !currentProfile.school_id
    ) {
      return NextResponse.json(
        {
          error:
            "Your administrator account is not assigned to a school.",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim()
        : "";

    /*
     * This endpoint deliberately supports
     * only student and school-admin roles.
     *
     * Super Admin role changes require a
     * separate protected workflow.
     */
    const requestedRole =
      body.role === "admin"
        ? "admin"
        : "student";

    const isActive =
      body.isActive === true;

    if (!fullName) {
      return NextResponse.json(
        {
          error:
            "Full name is required.",
        },
        { status: 400 }
      );
    }

    const adminSupabase =
      createAdminClient();

    /*
     * Read the target through the trusted
     * service-role client so we can perform
     * authorization ourselves.
     */
    const {
      data: targetProfile,
      error: targetError,
    } = await adminSupabase
      .from("profiles")
      .select(
        "id, role, is_active, school_id"
      )
      .eq("id", id)
      .maybeSingle();

    if (
      targetError ||
      !targetProfile
    ) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    /*
     * School Administrators are restricted
     * to their own school.
     */
    if (isSchoolAdmin) {
      if (
        targetProfile.role ===
        "super_admin"
      ) {
        return NextResponse.json(
          {
            error:
              "School Administrators cannot manage a Super Administrator.",
          },
          { status: 403 }
        );
      }

      if (
        targetProfile.school_id !==
        currentProfile.school_id
      ) {
        return NextResponse.json(
          {
            error:
              "You can only manage users in your own school.",
          },
          { status: 403 }
        );
      }
    }

    /*
     * Protect the currently logged-in account.
     */
    if (id === currentUser.id) {
      if (isSuperAdmin) {
        /*
         * This general user-management endpoint
         * must never turn the current Super Admin
         * into a school-level account.
         */
        if (
          targetProfile.role !==
          "super_admin"
        ) {
          return NextResponse.json(
            {
              error:
                "Your Super Administrator account could not be verified.",
            },
            { status: 403 }
          );
        }

        if (!isActive) {
          return NextResponse.json(
            {
              error:
                "You cannot deactivate your own Super Administrator account.",
            },
            { status: 400 }
          );
        }

        /*
         * Super Admin may edit their own name,
         * but role remains super_admin.
         */
        const { error: updateError } =
          await adminSupabase
            .from("profiles")
            .update({
              full_name: fullName,
            })
            .eq("id", id);

        if (updateError) {
          return NextResponse.json(
            {
              error:
                updateError.message,
            },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
        });
      }

      /*
       * School Admin may edit their own name,
       * but cannot demote or deactivate themselves.
       */
      if (requestedRole !== "admin") {
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

    /*
     * A Super Admin account cannot be modified
     * through the ordinary school-user controls.
     *
     * The only exception was the current Super
     * Admin editing their own name above.
     */
    if (
      targetProfile.role ===
      "super_admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Super Administrator accounts cannot be modified from standard user management.",
        },
        { status: 403 }
      );
    }

    /*
     * We deliberately do NOT update school_id.
     *
     * This prevents the ordinary Manage User
     * endpoint from moving users between schools.
     * School transfers can get their own protected
     * workflow later.
     */
    const { error: updateError } =
      await adminSupabase
        .from("profiles")
        .update({
          full_name: fullName,
          role: requestedRole,
          is_active: isActive,
        })
        .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        {
          error:
            updateError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Update user API error:",
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

/*
 * PUT
 *
 * Set a new password for a LearnBoard user.
 *
 * Existing passwords are never retrieved
 * or displayed.
 */
export async function PUT(
  request: Request,
  context: RouteContext
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
      .select("role, is_active, school_id")
      .eq("id", currentUser.id)
      .single();

    const isSuperAdmin =
      currentProfile?.role === "super_admin";

    const isSchoolAdmin =
      currentProfile?.role === "admin";

    if (
      !currentProfile ||
      !currentProfile.is_active ||
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

    if (
      isSchoolAdmin &&
      !currentProfile.school_id
    ) {
      return NextResponse.json(
        {
          error:
            "Your administrator account is not assigned to a school.",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "New password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    const adminSupabase =
      createAdminClient();

    const {
      data: targetProfile,
      error: targetError,
    } = await adminSupabase
      .from("profiles")
      .select(
        "id, role, school_id"
      )
      .eq("id", id)
      .maybeSingle();

    if (
      targetError ||
      !targetProfile
    ) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    /*
     * School Admin may reset passwords only
     * for users belonging to their own school.
     */
    if (isSchoolAdmin) {
      if (
        targetProfile.role ===
        "super_admin"
      ) {
        return NextResponse.json(
          {
            error:
              "School Administrators cannot reset a Super Administrator password.",
          },
          { status: 403 }
        );
      }

      if (
        targetProfile.school_id !==
        currentProfile.school_id
      ) {
        return NextResponse.json(
          {
            error:
              "You can only reset passwords for users in your own school.",
          },
          { status: 403 }
        );
      }
    }

    /*
     * A Super Admin may reset passwords for
     * school-level users.
     *
     * For additional protection, Super Admin
     * passwords themselves are not reset through
     * this general user-management endpoint.
     */
    if (
      targetProfile.role ===
      "super_admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Super Administrator passwords cannot be reset from standard user management.",
        },
        { status: 403 }
      );
    }

    const { error: passwordError } =
      await adminSupabase.auth.admin.updateUserById(
        id,
        {
          password,
        }
      );

    if (passwordError) {
      return NextResponse.json(
        {
          error:
            passwordError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Password updated successfully.",
    });
  } catch (error) {
    console.error(
      "Password reset API error:",
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