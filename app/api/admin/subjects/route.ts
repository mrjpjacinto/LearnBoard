import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request
) {
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

  const admin =
    createAdminClient();

  /*
   * Check case-insensitively so
   * Math and math cannot become
   * separate subjects.
   */
  const {
    data: existingSubjects,
    error: existingError,
  } = await admin
    .from("subjects")
    .select("id, name")
    .ilike("name", name)
    .limit(1);

  if (existingError) {
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
    existingSubjects &&
    existingSubjects.length > 0
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
   * New subjects go after the
   * current subjects by default.
   */
  const {
    data: lastSubject,
  } = await admin
    .from("subjects")
    .select("sort_order")
    .order(
      "sort_order",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  const nextSortOrder =
    typeof lastSubject
      ?.sort_order ===
      "number"
      ? lastSubject.sort_order +
        1
      : 0;

  const {
    data: subject,
    error: insertError,
  } = await admin
    .from("subjects")
    .insert({
      name,
      description:
        description || null,
      is_active: true,
      sort_order:
        nextSortOrder,
    })
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
    insertError ||
    !subject
  ) {
    /*
     * The database unique index is
     * the final protection against
     * duplicate subject names.
     */
    if (
      insertError?.code ===
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
          insertError?.message ||
          "Unable to create the subject.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(
    {
      subject,
    },
    {
      status: 201,
    }
  );
}