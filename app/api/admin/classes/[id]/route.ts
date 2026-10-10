import { readJson } from "@/lib/security/read-json";
import { NextResponse } from "next/server";
import { ownedClass } from "@/lib/lms/class-auth";
import { apiError } from "@/lib/lms/auth";


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

  let access: Awaited<ReturnType<typeof ownedClass>>;
  try { access = await ownedClass(id); } catch(error) { return apiError(error); }
  const {admin,targetClass} = access;

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