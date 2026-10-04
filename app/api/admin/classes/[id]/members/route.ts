import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

async function authorize(
  classId: string
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      ),
    };
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
    return {
      error: NextResponse.json(
        { error: "Forbidden." },
        { status: 403 }
      ),
    };
  }

  const admin =
    createAdminClient();

  const { data: targetClass } =
    await admin
      .from("groups")
      .select(
        "id, school_id"
      )
      .eq("id", classId)
      .maybeSingle();

  if (!targetClass) {
    return {
      error: NextResponse.json(
        {
          error:
            "Class not found.",
        },
        { status: 404 }
      ),
    };
  }

  if (
    isSchoolAdmin &&
    targetClass.school_id !==
      profile.school_id
  ) {
    return {
      error: NextResponse.json(
        { error: "Forbidden." },
        { status: 403 }
      ),
    };
  }

  return {
    admin,
    targetClass,
  };
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

  const body =
    await request.json();

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

  const body =
    await request.json();

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