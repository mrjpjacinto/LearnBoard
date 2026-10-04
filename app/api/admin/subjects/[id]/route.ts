import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  const { id } =
    await context.params;

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
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

  const { data: profile } =
    await supabase
      .from("profiles")
      .select(
        "role, is_active"
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
    return NextResponse.json(
      {
        error:
          "You do not have permission to manage subjects.",
      },
      {
        status: 403,
      }
    );
  }

  let body: {
    name?: unknown;
    description?: unknown;
    isActive?: unknown;
  };

  try {
    body =
      await request.json();
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

  const isActive =
    typeof body.isActive ===
    "boolean"
      ? body.isActive
      : null;

  if (!name) {
    return NextResponse.json(
      {
        error:
          "Subject name is required.",
      },
      {
        status: 400,
      }
    );
  }

  if (name.length > 100) {
    return NextResponse.json(
      {
        error:
          "Subject name cannot exceed 100 characters.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    description.length >
    500
  ) {
    return NextResponse.json(
      {
        error:
          "Description cannot exceed 500 characters.",
      },
      {
        status: 400,
      }
    );
  }

  if (isActive === null) {
    return NextResponse.json(
      {
        error:
          "Subject status is required.",
      },
      {
        status: 400,
      }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: existingSubject,
    error: subjectError,
  } = await admin
    .from("subjects")
    .select(
      "id, name, is_active"
    )
    .eq("id", id)
    .maybeSingle();

  if (
    subjectError ||
    !existingSubject
  ) {
    return NextResponse.json(
      {
        error:
          "Subject not found.",
      },
      {
        status: 404,
      }
    );
  }

  /*
   * Check whether another subject
   * already uses this name.
   */
  const {
    data: duplicates,
    error: duplicateError,
  } = await admin
    .from("subjects")
    .select("id")
    .ilike("name", name)
    .neq("id", id)
    .limit(1);

  if (duplicateError) {
    return NextResponse.json(
      {
        error:
          "Unable to validate the subject name.",
      },
      {
        status: 500,
      }
    );
  }

  if (
    duplicates &&
    duplicates.length > 0
  ) {
    return NextResponse.json(
      {
        error:
          "A subject with this name already exists.",
      },
      {
        status: 409,
      }
    );
  }

  /*
   * If the subject is being made
   * inactive, its skills are also
   * made inactive. This prevents an
   * active skill from appearing
   * underneath an inactive subject.
   *
   * We do not delete anything, and
   * existing games keep their
   * subject/skill relationships.
   */
  if (
    existingSubject.is_active &&
    !isActive
  ) {
    const {
      error: skillsError,
    } = await admin
      .from("skills")
      .update({
        is_active: false,
      })
      .eq(
        "subject_id",
        id
      );

    if (skillsError) {
      return NextResponse.json(
        {
          error:
            "Unable to update the subject's skills.",
        },
        {
          status: 500,
        }
      );
    }
  }

  const {
    data: subject,
    error: updateError,
  } = await admin
    .from("subjects")
    .update({
      name,
      description:
        description || null,
      is_active:
        isActive,
    })
    .eq("id", id)
    .select(
      `
        id,
        name,
        description,
        is_active,
        sort_order
      `
    )
    .single();

  if (
    updateError ||
    !subject
  ) {
    if (
      updateError?.code ===
      "23505"
    ) {
      return NextResponse.json(
        {
          error:
            "A subject with this name already exists.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          updateError?.message ||
          "Unable to update the subject.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    subject,
  });
}