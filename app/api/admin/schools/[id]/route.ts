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
  try {
    const { id } = await context.params;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
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
            "Super Admin access is required.",
        },
        { status: 403 }
      );
    }

    const body = await readJson(request);

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const code =
      typeof body.code === "string"
        ? body.code.trim()
        : "";

    const isActive =
      typeof body.is_active === "boolean"
        ? body.is_active
        : null;

    if (!id) {
      return NextResponse.json(
        { error: "School ID is required." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "School name is required." },
        { status: 400 }
      );
    }

    if (name.length > 150) {
      return NextResponse.json(
        {
          error:
            "School name must be 150 characters or fewer.",
        },
        { status: 400 }
      );
    }

    if (code.length > 50) {
      return NextResponse.json(
        {
          error:
            "School code must be 50 characters or fewer.",
        },
        { status: 400 }
      );
    }

    if (isActive === null) {
      return NextResponse.json(
        {
          error:
            "School status is required.",
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: existingSchool } = await admin
      .from("schools")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!existingSchool) {
      return NextResponse.json(
        { error: "School not found." },
        { status: 404 }
      );
    }

    const {
      data: duplicateName,
      error: duplicateNameError,
    } = await admin
      .from("schools")
      .select("id")
      .ilike("name", name)
      .neq("id", id)
      .maybeSingle();

    if (duplicateNameError) {
      console.error(
        "School name check error:",
        duplicateNameError
      );

      return NextResponse.json(
        {
          error:
            "The school could not be updated.",
        },
        { status: 500 }
      );
    }

    if (duplicateName) {
      return NextResponse.json(
        {
          error:
            "A school with this name already exists.",
        },
        { status: 409 }
      );
    }

    if (code) {
      const {
        data: duplicateCode,
        error: duplicateCodeError,
      } = await admin
        .from("schools")
        .select("id")
        .ilike("code", code)
        .neq("id", id)
        .maybeSingle();

      if (duplicateCodeError) {
        console.error(
          "School code check error:",
          duplicateCodeError
        );

        return NextResponse.json(
          {
            error:
              "The school could not be updated.",
          },
          { status: 500 }
        );
      }

      if (duplicateCode) {
        return NextResponse.json(
          {
            error:
              "A school with this code already exists.",
          },
          { status: 409 }
        );
      }
    }

    const { data: school, error } = await admin
      .from("schools")
      .update({
        name,
        code: code || null,
        is_active: isActive,
      })
      .eq("id", id)
      .select(
        "id, name, code, is_active, created_at"
      )
      .single();

    if (error) {
      console.error(
        "Update school error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "The school could not be updated.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "School updated successfully.",
      school,
    });
  } catch (error) {
    console.error(
      "School update API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}