import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PackageRecord = {
  id: string;
  storage_path: string | null;
  extraction_path: string | null;
};

export async function DELETE(
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
     * Removing SCORM packages is
     * strictly Super Admin only.
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
            "Only Super Admin can remove SCORM packages.",
        },
        {
          status: 403,
        }
      );
    }

    const admin =
      createAdminClient();

    /*
     * Confirm that the requested
     * game exists.
     */
    const {
      data: game,
      error: gameError,
    } = await admin
      .from("games")
      .select("id,scorm_version,launch_file,package_path")
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

    const history = await admin.from("attempts").select("id", { count: "exact", head: true }).eq("game_id", id);
    if (history.error || (history.count || 0) > 0) return NextResponse.json({ error: "Games with student attempts retain their content and results. Unpublish the game to stop new launches." }, { status: 409 });

    /*
     * Load ALL package rows attached
     * to this game.
     *
     * Normally there should be one.
     * Older or interrupted replacement
     * attempts may have left more than
     * one row behind.
     */
    const {
      data: packageData,
      error: packageError,
    } = await admin
      .from("scorm_packages")
      .select(
        `
          id,
          storage_path,
          extraction_path
        `
      )
      .eq("game_id", id);

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

    const packages =
      (packageData ||
        []) as PackageRecord[];

    if (
      packages.length === 0
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
     * STEP 1:
     * Clear the game's active SCORM
     * pointers first.
     *
     * If this fails, no package rows
     * or Storage objects are removed.
     */
    const {
      error: clearGameError,
    } = await admin
      .from("games")
      .update({
        scorm_version: null,
        launch_file: null,
        package_path: null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id);

    if (clearGameError) {
      console.error(
        "Unable to clear game SCORM pointers:",
        clearGameError
      );

      return NextResponse.json(
        {
          error:
            "Unable to remove the SCORM package.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * STEP 2:
     * Remove every package database
     * row for this game.
     *
     * We do this before deleting
     * Storage objects so the database
     * no longer references files that
     * are about to disappear.
     */
    const {
      error: deleteRecordsError,
    } = await admin
      .from("scorm_packages")
      .delete()
      .eq("game_id", id);

    if (deleteRecordsError) {
      const restore = await admin.from("games").update({ scorm_version: game.scorm_version, launch_file: game.launch_file, package_path: game.package_path }).eq("id", id);
      if (restore.error) console.error("Unable to restore package pointers:", restore.error);
      console.error(
        "Unable to delete SCORM package records:",
        deleteRecordsError
      );

      /*
       * The game has already been
       * detached from SCORM, but we
       * deliberately leave Storage
       * untouched when database cleanup
       * fails.
       */
      return NextResponse.json(
        {
          error:
            "The package could not be removed. Student history or another database record may depend on it.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * STEP 3:
     * Database state is now safe.
     *
     * Clean every known extraction
     * path and original ZIP.
     */
    for (
      const packageRecord
      of packages
    ) {
      if (
        packageRecord.extraction_path
      ) {
        await removeStoragePrefix(
          admin,
          packageRecord.extraction_path
        );
      }

      if (
        packageRecord.storage_path
      ) {
        const {
          error: zipDeleteError,
        } = await admin.storage
          .from("scorm-packages")
          .remove([
            packageRecord.storage_path,
          ]);

        if (zipDeleteError) {
          console.error(
            `Original SCORM ZIP cleanup failed for package ${packageRecord.id}:`,
            zipDeleteError
          );
        }
      }
    }

    /*
     * STEP 4:
     * Defensive cleanup.
     *
     * All LearnBoard SCORM files for a
     * game live below the game's folder.
     * Cleaning the whole folder catches
     * orphaned files from interrupted
     * historical operations that may no
     * longer have a database row.
     */
    await removeStoragePrefix(
      admin,
      id
    );

    return NextResponse.json(
      {
        success: true,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "SCORM removal route failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to remove the SCORM package.",
      },
      {
        status: 500,
      }
    );
  }
}

async function removeStoragePrefix(
  admin: ReturnType<
    typeof createAdminClient
  >,
  prefix: string
) {
  const normalizedPrefix =
    prefix
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");

  if (!normalizedPrefix) {
    return;
  }

  await removeStorageFolder(
    admin,
    normalizedPrefix
  );
}

async function removeStorageFolder(
  admin: ReturnType<
    typeof createAdminClient
  >,
  folder: string
) {
  const limit = 100;

  while (true) {
    const {
      data: entries,
      error: listError,
    } = await admin.storage
      .from("scorm-packages")
      .list(folder, {
        limit,
        offset: 0,
        sortBy: {
          column: "name",
          order: "asc",
        },
      });

    if (listError) {
      console.error(
        `Unable to list SCORM storage folder "${folder}":`,
        listError
      );

      return;
    }

    if (
      !entries ||
      entries.length === 0
    ) {
      return;
    }

    const files: string[] =
      [];

    const folders: string[] =
      [];

    for (
      const entry of entries
    ) {
      const path =
        `${folder}/${entry.name}`;

      /*
       * Storage files have an ID.
       * Folder entries do not.
       */
      if (entry.id) {
        files.push(path);
      } else {
        folders.push(path);
      }
    }

    /*
     * Clean child folders first.
     */
    for (
      const childFolder
      of folders
    ) {
      await removeStorageFolder(
        admin,
        childFolder
      );
    }

    /*
     * Then remove files directly
     * inside the current folder.
     */
    if (
      files.length > 0
    ) {
      const {
        error: removeError,
      } = await admin.storage
        .from("scorm-packages")
        .remove(files);

      if (removeError) {
        console.error(
          `Unable to clean SCORM storage folder "${folder}":`,
          removeError
        );

        return;
      }
    }

    /*
     * We always list from offset 0.
     * After deleting the first batch,
     * another loop handles any files
     * that remain.
     */
    if (
      entries.length < limit
    ) {
      return;
    }
  }
}