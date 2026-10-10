import { readJson } from "@/lib/security/read-json";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getCurrentAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Not authenticated.",
      status: 401,
    };
  }

  const { data: profile } =
    await supabase
      .from("profiles")
      .select(
        "id, role, is_active, school_id"
      )
      .eq("id", user.id)
      .single();

  if (
    !profile ||
    !profile.is_active ||
    ![
      "super_admin",
      "admin",
    ].includes(profile.role)
  ) {
    return {
      error: "Not authorized.",
      status: 403,
    };
  }

  return {
    user,
    profile,
  };
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } =
      await context.params;

    const authorization =
      await getCurrentAdmin();

    if (
      "error" in authorization
    ) {
      return NextResponse.json(
        {
          error:
            authorization.error,
        },
        {
          status:
            authorization.status,
        }
      );
    }

    const {
      user: currentUser,
      profile: currentProfile,
    } = authorization;

    const isSuperAdmin =
      currentProfile.role ===
      "super_admin";

    const admin =
      createAdminClient();

    const {
      data: targetUser,
      error: targetError,
    } = await admin
      .from("profiles")
      .select(
        "id, full_name, email, role, is_active, school_id"
      )
      .eq("id", id)
      .single();

    if (
      targetError ||
      !targetUser
    ) {
      return NextResponse.json(
        {
          error:
            "User not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * School Administrators can only
     * manage users in their own school.
     */
    if (!isSuperAdmin) {
      if (
        !currentProfile.school_id ||
        targetUser.school_id !==
          currentProfile.school_id
      ) {
        return NextResponse.json(
          {
            error:
              "You cannot manage users outside your school.",
          },
          {
            status: 403,
          }
        );
      }
    }

    /*
     * Standard user management cannot
     * modify another Super Administrator.
     *
     * The logged-in Super Administrator
     * may still update their own name.
     */
    if (
      targetUser.role ===
        "super_admin" &&
      targetUser.id !==
        currentUser.id
    ) {
      return NextResponse.json(
        {
          error:
            "Super Administrator accounts cannot be managed here.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await readJson(request);

    const fullName =
      typeof body.fullName ===
      "string"
        ? body.fullName.trim()
        : "";

    const requestedRole =
      typeof body.role ===
      "string"
        ? body.role
        : targetUser.role;

    const requestedActive =
      typeof body.isActive ===
      "boolean"
        ? body.isActive
        : targetUser.is_active;

    const requestedSchoolId =
      typeof body.schoolId ===
      "string"
        ? body.schoolId.trim()
        : "";

    const requestedClassIds =
      Array.isArray(
        body.classIds
      )
        ? Array.from(
            new Set(
              body.classIds.filter(
                (
                  value: unknown
                ): value is string =>
                  typeof value ===
                    "string" &&
                  value.length > 0
              )
            )
          )
        : [];

    if (!fullName) {
      return NextResponse.json(
        {
          error:
            "Full name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      fullName.length > 150
    ) {
      return NextResponse.json(
        {
          error:
            "Full name is too long.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Super Administrator protection.
     */
    if (
      targetUser.role ===
      "super_admin"
    ) {
      if (
        targetUser.id !==
        currentUser.id
      ) {
        return NextResponse.json(
          {
            error:
              "Super Administrator accounts cannot be modified.",
          },
          {
            status: 403,
          }
        );
      }

      const {
        error: updateError,
      } = await admin
        .from("profiles")
        .update({
          full_name: fullName,
        })
        .eq(
          "id",
          targetUser.id
        );

      if (updateError) {
        return NextResponse.json(
          {
            error:
              updateError.message,
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        success: true,
      });
    }

    /*
     * Only student/admin roles can
     * be assigned through this API.
     */
    if (
      requestedRole !==
        "student" &&
      requestedRole !== "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid user role.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Users cannot change their own
     * administrator role or deactivate
     * their own account.
     */
    if (
      targetUser.id ===
      currentUser.id
    ) {
      if (
        requestedRole !==
        targetUser.role
      ) {
        return NextResponse.json(
          {
            error:
              "You cannot change your own administrator role.",
          },
          {
            status: 400,
          }
        );
      }

      if (!requestedActive) {
        return NextResponse.json(
          {
            error:
              "You cannot deactivate your own account.",
          },
          {
            status: 400,
          }
        );
      }
    }

    let finalSchoolId:
      | string
      | null =
      targetUser.school_id;

    /*
     * Super Admin may transfer a user
     * to another school.
     *
     * School Admin is always restricted
     * to their own school.
     */
    if (isSuperAdmin) {
      if (!requestedSchoolId) {
        return NextResponse.json(
          {
            error:
              "Please select a school.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data: destinationSchool,
        error: schoolError,
      } = await admin
        .from("schools")
        .select(
          "id, is_active"
        )
        .eq(
          "id",
          requestedSchoolId
        )
        .single();

      if (
        schoolError ||
        !destinationSchool
      ) {
        return NextResponse.json(
          {
            error:
              "Selected school was not found.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * Existing users already assigned
       * to an inactive school may still
       * be edited without transferring.
       * New transfers into an inactive
       * school are not allowed.
       */
      if (
        !destinationSchool.is_active &&
        requestedSchoolId !==
          targetUser.school_id
      ) {
        return NextResponse.json(
          {
            error:
              "You cannot transfer a user to an inactive school.",
          },
          {
            status: 400,
          }
        );
      }

      finalSchoolId =
        requestedSchoolId;
    } else {
      if (
        !currentProfile.school_id
      ) {
        return NextResponse.json(
          {
            error:
              "Your administrator account is not assigned to a school.",
          },
          {
            status: 403,
          }
        );
      }

      finalSchoolId =
        currentProfile.school_id;
    }

    /*
     * Validate every requested class.
     *
     * All selected classes must belong
     * to the user's final school.
     */
    if (
      requestedRole ===
        "student" &&
      requestedClassIds.length >
        0
    ) {
      const {
        data: selectedClasses,
        error: classesError,
      } = await admin
        .from("groups")
        .select(
          "id, school_id, is_active"
        )
        .in(
          "id",
          requestedClassIds
        );

      if (classesError) {
        return NextResponse.json(
          {
            error:
              classesError.message,
          },
          {
            status: 500,
          }
        );
      }

      if (
        !selectedClasses ||
        selectedClasses.length !==
          requestedClassIds.length
      ) {
        return NextResponse.json(
          {
            error:
              "One or more selected classes could not be found.",
          },
          {
            status: 400,
          }
        );
      }

      const invalidClass =
        selectedClasses.find(
          (classItem) =>
            classItem.school_id !==
              finalSchoolId ||
            !classItem.is_active
        );

      if (invalidClass) {
        return NextResponse.json(
          {
            error:
              "Students can only be assigned to active classes in their school.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const { error: updateError } = await admin.rpc("learnboard_update_user", {
      p_actor: currentUser.id, p_target: targetUser.id, p_name: fullName,
      p_role: requestedRole, p_active: requestedActive, p_school: finalSchoolId,
      p_classes: requestedRole === "student" ? requestedClassIds : [],
    });
    if (updateError) return NextResponse.json({ error: updateError.code === "PGRST202" ? "The LMS database update is required to save users safely." : updateError.code === "P0001" ? updateError.message : "Unable to update the user and class memberships." }, { status: updateError.code === "PGRST202" ? 503 : 400 });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Update user error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to update user.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } =
      await context.params;

    const authorization =
      await getCurrentAdmin();

    if (
      "error" in authorization
    ) {
      return NextResponse.json(
        {
          error:
            authorization.error,
        },
        {
          status:
            authorization.status,
        }
      );
    }

    const {
      profile: currentProfile,
    } = authorization;

    const isSuperAdmin =
      currentProfile.role ===
      "super_admin";

    const admin =
      createAdminClient();

    const {
      data: targetUser,
      error: targetError,
    } = await admin
      .from("profiles")
      .select(
        "id, role, school_id"
      )
      .eq("id", id)
      .single();

    if (
      targetError ||
      !targetUser
    ) {
      return NextResponse.json(
        {
          error:
            "User not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Never reset a Super Admin password
     * through normal user management.
     */
    if (
      targetUser.role ===
      "super_admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Super Administrator passwords cannot be changed here.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * School Admin may only reset
     * passwords inside their school.
     */
    if (!isSuperAdmin) {
      if (
        !currentProfile.school_id ||
        targetUser.school_id !==
          currentProfile.school_id
      ) {
        return NextResponse.json(
          {
            error:
              "You cannot manage users outside your school.",
          },
          {
            status: 403,
          }
        );
      }
    }

    const body =
      await readJson(request);

    const password =
      typeof body.password ===
      "string"
        ? body.password
        : "";

    if (
      password.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      error: passwordError,
    } =
      await admin.auth.admin.updateUserById(
        targetUser.id,
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
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to update password.",
      },
      {
        status: 500,
      }
    );
  }
}