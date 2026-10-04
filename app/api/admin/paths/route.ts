import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type CreatePathBody = {
  name?: unknown;
  description?: unknown;
  status?: unknown;
  school_id?: unknown;
};

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "You must be signed in.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * Load the authenticated user's
     * role and school.
     */
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "role, is_active, school_id"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      !profile.is_active ||
      ![
        "super_admin",
        "admin",
      ].includes(profile.role)
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to create Learning Paths.",
        },
        {
          status: 403,
        }
      );
    }

    const isSuperAdmin =
      profile.role ===
      "super_admin";

    let body: CreatePathBody;

    try {
      body =
        (await request.json()) as CreatePathBody;
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request.",
        },
        {
          status: 400,
        }
      );
    }

    const name =
      typeof body.name ===
      "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description ===
      "string"
        ? body.description.trim()
        : "";

    const status =
      typeof body.status ===
      "string"
        ? body.status.trim()
        : "";

    const requestedSchoolId =
      typeof body.school_id ===
      "string"
        ? body.school_id.trim()
        : "";

    /*
     * Validate path fields.
     */
    if (!name) {
      return NextResponse.json(
        {
          error:
            "Learning Path name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (name.length > 150) {
      return NextResponse.json(
        {
          error:
            "Learning Path name must be 150 characters or fewer.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      description.length >
      1000
    ) {
      return NextResponse.json(
        {
          error:
            "Description must be 1,000 characters or fewer.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      status !== "active" &&
      status !== "archived"
    ) {
      return NextResponse.json(
        {
          error:
            "Choose a valid Learning Path status.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * School ownership is determined
     * server-side.
     *
     * Super Admin chooses a school.
     * School Admin is always forced to
     * their own school, regardless of
     * what the browser sends.
     */
    let pathSchoolId:
      | string
      | null = null;

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

      pathSchoolId =
        requestedSchoolId;
    } else {
      if (!profile.school_id) {
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

      pathSchoolId =
        profile.school_id;
    }

    const admin =
      createAdminClient();

    /*
     * Confirm the destination school
     * exists and is active.
     */
    const {
      data: school,
      error: schoolError,
    } = await admin
      .from("schools")
      .select("id")
      .eq(
        "id",
        pathSchoolId
      )
      .eq("is_active", true)
      .maybeSingle();

    if (
      schoolError ||
      !school
    ) {
      return NextResponse.json(
        {
          error:
            "The selected school is not available.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Prevent duplicate path names
     * inside the same school.
     *
     * The database unique index is the
     * final protection; this check gives
     * the user a clearer message.
     */
    const {
      data: existingPaths,
      error:
        existingPathError,
    } = await admin
      .from("learning_boards")
      .select("id, name")
      .eq(
        "school_id",
        pathSchoolId
      );

    if (existingPathError) {
      console.error(
        "Unable to check existing Learning Paths:",
        existingPathError
      );

      return NextResponse.json(
        {
          error:
            "Unable to create the Learning Path.",
        },
        {
          status: 500,
        }
      );
    }

    const duplicateExists =
      (existingPaths || []).some(
        (path) =>
          typeof path.name ===
            "string" &&
          path.name
            .trim()
            .toLocaleLowerCase() ===
            name.toLocaleLowerCase()
      );

    if (duplicateExists) {
      return NextResponse.json(
        {
          error:
            "A Learning Path with this name already exists at this school.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Create the Learning Path.
     *
     * We use the server-only admin
     * client after explicitly enforcing
     * role and school ownership above.
     */
    const {
      data: path,
      error: insertError,
    } = await admin
      .from("learning_boards")
      .insert({
        name,
        description:
          description || null,
        status,
        school_id:
          pathSchoolId,
        created_by:
          user.id,
      })
      .select(
        `
          id,
          name,
          description,
          status,
          school_id,
          created_by,
          created_at,
          updated_at
        `
      )
      .single();

    if (insertError) {
      console.error(
        "Unable to create Learning Path:",
        insertError
      );

      /*
       * PostgreSQL unique violation.
       * This also handles simultaneous
       * requests that pass the earlier
       * duplicate-name check.
       */
      if (
        insertError.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            error:
              "A Learning Path with this name already exists at this school.",
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "Unable to create the Learning Path.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        path,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Unexpected Learning Path creation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to create the Learning Path.",
      },
      {
        status: 500,
      }
    );
  }
}