import { readJson } from "@/lib/security/read-json";
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
    profile.role !== "super_admin"
  ) {
    return NextResponse.json(
      {
        error:
          "You do not have permission to manage skills.",
      },
      {
        status: 403,
      }
    );
  }

  let body: {
    subjectId?: unknown;
    name?: unknown;
    description?: unknown;
  };

  try {
    body =
      await readJson(request);
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

  const subjectId =
    typeof body.subjectId ===
    "string"
      ? body.subjectId.trim()
      : "";

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

  if (!subjectId) {
    return NextResponse.json(
      {
        error:
          "A subject is required.",
      },
      {
        status: 400,
      }
    );
  }

  if (!name) {
    return NextResponse.json(
      {
        error:
          "Skill name is required.",
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
          "Skill name cannot exceed 100 characters.",
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
   * Make sure the selected subject
   * really exists.
   */
  const {
    data: subject,
    error: subjectError,
  } = await admin
    .from("subjects")
    .select(
      "id, name, is_active"
    )
    .eq("id", subjectId)
    .maybeSingle();

  if (
    subjectError ||
    !subject
  ) {
    return NextResponse.json(
      {
        error:
          "The selected subject could not be found.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * Prevent duplicate skill names
   * inside the same subject.
   *
   * Math -> Division
   * English -> Division
   *
   * could technically coexist,
   * but Math -> Division cannot be
   * created twice.
   */
  const {
    data: existingSkills,
    error: existingError,
  } = await admin
    .from("skills")
    .select("id, name")
    .eq(
      "subject_id",
      subjectId
    )
    .ilike("name", name)
    .limit(1);

  if (existingError) {
    return NextResponse.json(
      {
        error:
          "Unable to validate the skill name.",
      },
      {
        status: 500,
      }
    );
  }

  if (
    existingSkills &&
    existingSkills.length > 0
  ) {
    return NextResponse.json(
      {
        error:
          "This skill already exists under the selected subject.",
      },
      {
        status: 409,
      }
    );
  }

  /*
   * Put the new skill after the
   * existing skills belonging to
   * this subject.
   */
  const {
    data: lastSkill,
  } = await admin
    .from("skills")
    .select("sort_order")
    .eq(
      "subject_id",
      subjectId
    )
    .order(
      "sort_order",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  const nextSortOrder =
    typeof lastSkill
      ?.sort_order ===
      "number"
      ? lastSkill.sort_order +
        1
      : 0;

  const {
    data: skill,
    error: insertError,
  } = await admin
    .from("skills")
    .insert({
      subject_id:
        subjectId,
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
        subject_id,
        name,
        description,
        is_active,
        sort_order
      `
    )
    .single();

  if (
    insertError ||
    !skill
  ) {
    if (
      insertError?.code ===
      "23505"
    ) {
      return NextResponse.json(
        {
          error:
            "This skill already exists under the selected subject.",
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
          "Unable to create the skill.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(
    {
      skill,
    },
    {
      status: 201,
    }
  );
}