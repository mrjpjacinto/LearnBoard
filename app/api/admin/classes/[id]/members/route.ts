import { readJson } from "@/lib/security/read-json";
import { NextResponse } from "next/server";
import { ownedClass } from "@/lib/lms/class-auth";
import { apiError } from "@/lib/lms/auth";


type Context = {
  params: Promise<{
    id: string;
  }>;
};

async function authorize(classId: string) {
  try { const {admin,targetClass} = await ownedClass(classId); return {admin,targetClass}; }
  catch(error) { return {error:apiError(error)}; }
}

export async function POST(
  request: Request,
  context: Context
) {
  const { id } =
    await context.params;

  const authorization =
    await authorize(id);

  if (authorization.error) {
    return authorization.error;
  }

  const {
    admin,
    targetClass,
  } = authorization;

  let body: Record<string,unknown>;
  try { body = await readJson(request); } catch(error) { return apiError(error); }

  const studentId =
    typeof body.studentId ===
    "string"
      ? body.studentId
      : "";

  if (!studentId) {
    return NextResponse.json(
      {
        error:
          "Student is required.",
      },
      { status: 400 }
    );
  }

  const { data: student } =
    await admin
      .from("profiles")
      .select(
        "id, role, school_id, is_active"
      )
      .eq("id", studentId)
      .maybeSingle();

  if (
    !student ||
    student.role !==
      "student" ||
    !student.is_active
  ) {
    return NextResponse.json(
      {
        error:
          "The selected student is not active.",
      },
      { status: 400 }
    );
  }

  if (
    student.school_id !==
    targetClass.school_id
  ) {
    return NextResponse.json(
      {
        error:
          "The student and class must belong to the same school.",
      },
      { status: 400 }
    );
  }

  const { error } =
    await admin
      .from("group_members")
      .upsert(
        {
          group_id: id,
          user_id: studentId,
        },
        {
          onConflict:
            "group_id,user_id",
        }
      );

  if (error) {
    return NextResponse.json(
      {
        error:
          "Unable to add student.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
  });
}

export async function DELETE(
  request: Request,
  context: Context
) {
  const { id } =
    await context.params;

  const authorization =
    await authorize(id);

  if (authorization.error) {
    return authorization.error;
  }

  const { admin } =
    authorization;

  let body: Record<string,unknown>;
  try { body = await readJson(request); } catch(error) { return apiError(error); }

  const studentId =
    typeof body.studentId ===
    "string"
      ? body.studentId
      : "";

  if (!studentId) {
    return NextResponse.json(
      {
        error:
          "Student is required.",
      },
      { status: 400 }
    );
  }

  const { error } =
    await admin
      .from("group_members")
      .delete()
      .eq("group_id", id)
      .eq(
        "user_id",
        studentId
      );

  if (error) {
    return NextResponse.json(
      {
        error:
          "Unable to remove student.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
  });
}