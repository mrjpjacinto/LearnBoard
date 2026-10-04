import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: Context
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
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  const { data: profile } =
    await supabase
      .from("profiles")
      .select(
        "role, is_active, school_id"
      )
      .eq("id", user.id)
      .single();

  const isSuperAdmin =
    profile?.role ===
    "super_admin";

  const isSchoolAdmin =
    profile?.role === "admin";

  if (
    !profile ||
    !profile.is_active ||
    (!isSuperAdmin &&
      !isSchoolAdmin)
  ) {
    return NextResponse.json(
      { error: "Forbidden." },
      { status: 403 }
    );
  }

  const admin =
    createAdminClient();

  const { data: targetClass } =
    await admin
      .from("groups")
      .select(
        "id, school_id"
      )
      .eq("id", id)
      .maybeSingle();

  if (!targetClass) {
    return NextResponse.json(
      {
        error:
          "Class not found.",
      },
      { status: 404 }
    );
  }

  if (
    isSchoolAdmin &&
    targetClass.school_id !==
      profile.school_id
  ) {
    return NextResponse.json(
      { error: "Forbidden." },
      { status: 403 }
    );
  }

  const body =
    await request.json();

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
    body.isActive === true;

  if (!name) {
    return NextResponse.json(
      {
        error:
          "Class name is required.",
      },
      { status: 400 }
    );
  }

  if (name.length > 150) {
    return NextResponse.json(
      {
        error:
          "Class name is too long.",
      },
      { status: 400 }
    );
  }

  if (
    description.length > 500
  ) {
    return NextResponse.json(
      {
        error:
          "Description is too long.",
      },
      { status: 400 }
    );
  }

  const { data: duplicate } =
    await admin
      .from("groups")
      .select("id")
      .eq(
        "school_id",
        targetClass.school_id
      )
      .ilike("name", name)
      .neq("id", id)
      .maybeSingle();

  if (duplicate) {
    return NextResponse.json(
      {
        error:
          "A class with this name already exists in this school.",
      },
      { status: 409 }
    );
  }

  const { data, error } =
    await admin
      .from("groups")
      .update({
        name,
        description:
          description || null,
        is_active: isActive,
      })
      .eq("id", id)
      .select()
      .single();

  if (error) {
    return NextResponse.json(
      {
        error:
          error.code === "23505"
            ? "A class with this name already exists in this school."
            : "Unable to update class.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    class: data,
  });
}