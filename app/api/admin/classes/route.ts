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

  let schoolId:
    | string
    | null = null;

  if (isSuperAdmin) {
    schoolId =
      typeof body.schoolId ===
      "string"
        ? body.schoolId
        : null;
  } else {
    schoolId =
      profile.school_id;
  }

  if (!schoolId) {
    return NextResponse.json(
      {
        error:
          "A school is required.",
      },
      { status: 400 }
    );
  }

  const admin =
    createAdminClient();

  const { data: school } =
    await admin
      .from("schools")
      .select("id, is_active")
      .eq("id", schoolId)
      .maybeSingle();

  if (
    !school ||
    !school.is_active
  ) {
    return NextResponse.json(
      {
        error:
          "The selected school is not active.",
      },
      { status: 400 }
    );
  }

  const {
    data: existingClass,
  } = await admin
    .from("groups")
    .select("id")
    .eq("school_id", schoolId)
    .ilike("name", name)
    .maybeSingle();

  if (existingClass) {
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
      .insert({
        name,
        description:
          description || null,
        school_id: schoolId,
        is_active: true,
      })
      .select()
      .single();

  if (error) {
    return NextResponse.json(
      {
        error:
          error.code === "23505"
            ? "A class with this name already exists in this school."
            : "Unable to create class.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    class: data,
  });
}