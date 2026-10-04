import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(
  request: Request,
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

    /*
     * Delete Game is intentionally
     * Super Admin only.
     */
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
            "Only a Super Admin can delete a game.",
        },
        {
          status: 403,
        }
      );
    }

    const admin =
      createAdminClient();

    /*
     * Load the game before deleting it
     * so its associated Storage files
     * can be cleaned afterward.
     */
    const {
      data: game,
      error: gameError,
    } = await admin
      .from("games")
      .select(
        "id, name, image_path"
      )
      .eq("id", id)
      .maybeSingle();

    if (gameError) {
      console.error(
        "Unable to load game before deletion:",
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

    const history = await admin.from("attempts").select("id", { count: "exact", head: true }).eq("game_id", id);
    if (history.error || (history.count || 0) > 0) return NextResponse.json({ error: "Games with student attempts retain their content and results. Unpublish the game to stop new launches." }, { status: 409 });

    /*
     * Load every SCORM package row.
     * Using an array also handles older
     * games that may contain more than
     * one package record.
     */
    const {
      data: packages,
      error: packagesError,
    } = await admin
      .from("scorm_packages")
      .select(
        "id, storage_path"
      )
      .eq("game_id", id);

    if (packagesError) {
      console.error(
        "Unable to load SCORM packages before game deletion:",
        packagesError
      );

      return NextResponse.json(
        {
          error:
            "Unable to inspect the game's SCORM package.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Delete the database game first.
     *
     * This allows database relationships
     * to stop deletion if protected
     * LearnBoard records still depend
     * on the game.
     *
     * Storage remains untouched if the
     * database rejects the deletion.
     */
    const {
      error: deleteGameError,
    } = await admin
      .from("games")
      .delete()
      .eq("id", id);

    if (deleteGameError) {
      console.error(
        "Unable to delete game:",
        deleteGameError
      );

      return NextResponse.json(
        {
          error:
            "This game could not be deleted. It may still be connected to other LearnBoard records.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Database deletion succeeded.
     * Storage cleanup now happens
     * afterward.
     */
    if (game.image_path) {
      const {
        error: imageRemoveError,
      } = await admin.storage
        .from("game-images")
        .remove([
          game.image_path,
        ]);

      if (imageRemoveError) {
        console.error(
          "Game deleted but image cleanup failed:",
          imageRemoveError
        );
      }
    }

    /*
     * Remove everything stored beneath
     * the game's SCORM folder.
     */
    const scormFiles =
      await listStorageFiles(
        admin,
        "scorm-packages",
        id
      );

    if (
      scormFiles.length > 0
    ) {
      const {
        error: scormRemoveError,
      } = await admin.storage
        .from("scorm-packages")
        .remove(scormFiles);

      if (scormRemoveError) {
        console.error(
          "Game deleted but SCORM storage cleanup failed:",
          scormRemoveError
        );
      }
    }

    /*
     * Remove any remaining package rows
     * if the game relationship did not
     * already remove them automatically.
     */
    if (
      packages &&
      packages.length > 0
    ) {
      const {
        error: packageDeleteError,
      } = await admin
        .from("scorm_packages")
        .delete()
        .eq("game_id", id);

      if (packageDeleteError) {
        console.error(
          "Game deleted but package-row cleanup failed:",
          packageDeleteError
        );
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Unexpected Delete Game error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to delete the game.",
      },
      {
        status: 500,
      }
    );
  }
}

async function listStorageFiles(
  admin: ReturnType<
    typeof createAdminClient
  >,
  bucket: string,
  folder: string
): Promise<string[]> {
  const collected: string[] =
    [];

  const {
    data,
    error,
  } = await admin.storage
    .from(bucket)
    .list(folder, {
      limit: 1000,
    });

  if (error) {
    console.error(
      `Unable to list storage folder ${folder}:`,
      error
    );

    return collected;
  }

  if (!data) {
    return collected;
  }

  for (const item of data) {
    const path =
      `${folder}/${item.name}`;

    /*
     * Storage file objects have an ID.
     * Folder entries do not.
     */
    if (item.id) {
      collected.push(path);
      continue;
    }

    const nested =
      await listStorageFiles(
        admin,
        bucket,
        path
      );

    collected.push(
      ...nested
    );
  }

  return collected;
}