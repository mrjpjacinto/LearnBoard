import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } =
      await context.params;

    const supabase =
      await createClient();

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (
      authError ||
      !user
    ) {
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

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "role, is_active"
      )
      .eq("id", user.id)
      .maybeSingle();

    /*
     * SCORM package download is
     * intentionally restricted to
     * Super Admin only.
     */
    if (
      profileError ||
      !profile ||
      !profile.is_active ||
      profile.role !==
        "super_admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Only Super Admin can download SCORM packages.",
        },
        {
          status: 403,
        }
      );
    }

    const admin =
      createAdminClient();

    /*
     * Make sure the requested game
     * exists.
     */
    const {
      data: game,
      error: gameError,
    } = await admin
      .from("games")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (gameError) {
      console.error(
        "Game lookup failed:",
        gameError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load the game.",
        },
        {
          status: 500,
        }
      );
    }

    if (!game) {
      return NextResponse.json(
        {
          error:
            "Game not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Locate the newest package row.
     *
     * Normally there should be only one
     * package for a game. However, older
     * or interrupted replacement attempts
     * may have left multiple rows behind.
     *
     * Using order + limit avoids the
     * multiple-row failure that
     * maybeSingle() would cause.
     */
    const {
      data: packageRows,
      error: packageError,
    } = await admin
      .from("scorm_packages")
      .select(
        `
          id,
          file_name,
          storage_path,
          created_at
        `
      )
      .eq("game_id", id)
      .order("created_at", {
        ascending: false,
      })
      .limit(1);

    if (packageError) {
      console.error(
        "SCORM package lookup failed:",
        packageError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load the SCORM package.",
        },
        {
          status: 500,
        }
      );
    }

    const packageRecord =
      packageRows?.[0] ?? null;

    if (
      !packageRecord ||
      !packageRecord.storage_path
    ) {
      return NextResponse.json(
        {
          error:
            "No SCORM package is attached to this game.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * The scorm-packages bucket is
     * private. Download through this
     * authenticated server endpoint
     * instead of exposing a public
     * Storage URL.
     */
    const {
      data: zipData,
      error: downloadError,
    } = await admin.storage
      .from("scorm-packages")
      .download(
        packageRecord.storage_path
      );

    if (
      downloadError ||
      !zipData
    ) {
      console.error(
        "SCORM ZIP download failed:",
        downloadError
      );

      return NextResponse.json(
        {
          error:
            "Unable to download the SCORM package.",
        },
        {
          status: 500,
        }
      );
    }

    const arrayBuffer =
      await zipData.arrayBuffer();

    /*
     * Preserve the original filename,
     * while removing characters that
     * are unsafe inside the download
     * response header.
     */
    const safeFileName =
      (
        packageRecord.file_name ||
        "scorm-package.zip"
      )
        .replace(
          /[\r\n"]/g,
          ""
        )
        .replace(
          /[\\/]/g,
          "-"
        );

    return new Response(
      arrayBuffer,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/zip",

          "Content-Disposition":
            `attachment; filename="${safeFileName}"`,

          "Content-Length":
            String(
              arrayBuffer.byteLength
            ),

          "Cache-Control":
            "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "SCORM download route failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to download the SCORM package.",
      },
      {
        status: 500,
      }
    );
  }
}