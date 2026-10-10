import { classificationImpact } from "@/lib/lms/game-skills-server";
import { authorize, apiError, checkDb, LmsError, uuid } from "@/lib/lms/auth";
import { readJson } from "@/lib/security/read-json";
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
    name?: unknown;
    description?: unknown;
    isActive?: unknown;
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

  const isActive = true;

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

  if (isActive === null) {
    return NextResponse.json(
      {
        error:
          "Skill status is required.",
      },
      {
        status: 400,
      }
    );
  }

  const admin =
    createAdminClient();

  /*
   * Load the existing skill so we
   * know which subject it belongs to.
   */
  const {
    data: existingSkill,
    error: skillError,
  } = await admin
    .from("skills")
    .select(
      `
        id,
        subject_id,
        name,
        is_active
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (
    skillError ||
    !existingSkill
  ) {
    return NextResponse.json(
      {
        error:
          "Skill not found.",
      },
      {
        status: 404,
      }
    );
  }

  /*
   * An inactive subject cannot have
   * an active skill.
   */
  if (isActive) {
    const {
      data: subject,
      error: subjectError,
    } = await admin
      .from("subjects")
      .select(
        "id, is_active"
      )
      .eq(
        "id",
        existingSkill.subject_id
      )
      .maybeSingle();

    if (
      subjectError ||
      !subject
    ) {
      return NextResponse.json(
        {
          error:
            "The skill's subject could not be found.",
        },
        {
          status: 400,
        }
      );
    }

    if (!subject.is_active) {
      return NextResponse.json(
        {
          error:
            "Activate the subject before activating this skill.",
        },
        {
          status: 400,
        }
      );
    }
  }

  /*
   * Prevent another skill underneath
   * the same subject from using the
   * same name.
   */
  const {
    data: duplicates,
    error: duplicateError,
  } = await admin
    .from("skills")
    .select("id")
    .eq(
      "subject_id",
      existingSkill.subject_id
    )
    .ilike("name", name)
    .neq("id", id)
    .limit(1);

  if (duplicateError) {
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
    duplicates &&
    duplicates.length > 0
  ) {
    return NextResponse.json(
      {
        error:
          "This skill already exists under this subject.",
      },
      {
        status: 409,
      }
    );
  }

  const {
    data: skill,
    error: updateError,
  } = await admin
    .from("skills")
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
        subject_id,
        name,
        description,
        is_active,
        sort_order
      `
    )
    .single();

  if (
    updateError ||
    !skill
  ) {
    if (
      updateError?.code ===
      "23505"
    ) {
      return NextResponse.json(
        {
          error:
            "This skill already exists under this subject.",
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
          "Unable to update the skill.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    skill,
  });
}
export async function DELETE(request: Request, context: RouteContext) {
 try {
  const {admin}=await authorize(["super_admin"]);
  const id=uuid((await context.params).id);
  const item=await admin.from("skills").select("id").eq("id",id).maybeSingle();checkDb(item.error);
  if(!item.data)throw new LmsError("Skill not found.",404);
  const games=await classificationImpact(admin,"skills",id);
  if(games.count>0&&new URL(request.url).searchParams.get("confirm")!=="true")return NextResponse.json({error:"Confirm deletion to remove these skill assignments.",requires_confirmation:true,affected_games:games.count,unassigned_games:games.unassigned},{status:409});
  // Existing foreign keys detach game classifications; game records and history remain.
  const result=await admin.from("skills").delete().eq("id",id);checkDb(result.error);
  return NextResponse.json({success:true,affected_games:games.count});
 }catch(error){return apiError(error);}
}
