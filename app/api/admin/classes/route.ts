import { readJson } from "@/lib/security/read-json";
import { NextResponse } from "next/server";
import { authorize, apiError } from "@/lib/lms/auth";


export async function POST(
  request: Request
) {
  let auth: Awaited<ReturnType<typeof authorize>>;
  try { auth = await authorize(["super_admin","admin"]); } catch(error) { return apiError(error); }
  const {admin,profile} = auth;
  const isSuperAdmin = profile.role === "super_admin";

  let body: Record<string,unknown>;
  try { body = await readJson(request); } catch(error) { return apiError(error); }

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