import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
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
        { error: "Super Admin access is required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const code =
      typeof body.code === "string"
        ? body.code.trim()
        : "";

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

    const admin = createAdminClient();

    const { data: existingSchool } = await admin
      .from("schools")
      .select("id")
      .ilike("name", name)
      .maybeSingle();

    if (existingSchool) {
      return NextResponse.json(
        {
          error:
            "A school with this name already exists.",
        },
        { status: 409 }
      );
    }

    if (code) {
      const { data: existingCode } = await admin
        .from("schools")
        .select("id")
        .ilike("code", code)
        .maybeSingle();

      if (existingCode) {
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
      .insert({
        name,
        code: code || null,
        is_active: true,
      })
      .select(
        "id, name, code, is_active, created_at"
      )
      .single();

    if (error) {
      console.error(
        "Create school error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "The school could not be created.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message:
          "School created successfully.",
        school,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "School API error:",
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