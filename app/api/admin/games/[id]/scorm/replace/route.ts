import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processScormPackage } from "@/lib/scorm/process-package";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const MAX_SCORM_SIZE =
  150 * 1024 * 1024;

function safeFileName(
  value: string
) {
  return value
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "-"
    )
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  let newStoragePath:
    | string
    | null = null;

  let replacementPackageId:
    | string
    | null = null;

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
     * SCORM package replacement is
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
            "Only a Super Admin can replace SCORM packages.",
        },
        {
          status: 403,
        }
      );
    }

    const formData =
      await request.formData();

    const fileValue =
      formData.get("file");

    if (
      !(fileValue instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            "Please select a SCORM ZIP package.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      fileValue.size === 0
    ) {
      return NextResponse.json(
        {
          error:
            "The selected SCORM package is empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      fileValue.size >
      MAX_SCORM_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "SCORM package cannot exceed 150 MB.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !fileValue.name
        .toLowerCase()
        .endsWith(".zip")
    ) {
      return NextResponse.json(
        {
          error:
            "SCORM package must be a ZIP file.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      createAdminClient();

    /*
     * Preserve the game's current
     * SCORM pointers.
     *
     * If the replacement package fails,
     * these values are restored.
     */
    const {
      data: game,
      error: gameError,
    } = await admin
      .from("games")
      .select(
        `
          id,
          scorm_version,
          launch_file,
          package_path
        `
      )
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
     * Load ALL existing package rows.
     *
     * Older or interrupted replacement
     * attempts may have left more than
     * one row behind.
     *
     * None of these packages are touched
     * until the replacement succeeds.
     */
    const {
      data: existingPackageData,
      error:
        existingPackagesError,
    } = await admin
      .from("scorm_packages")
      .select(
        `
          id,
          storage_path,
          extraction_path
        `
      )
      .eq("game_id", id)
      .order("created_at", {
        ascending: false,
      });

    if (
      existingPackagesError
    ) {
      console.error(
        "Existing SCORM package lookup failed:",
        existingPackagesError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load the current SCORM package.",
        },
        {
          status: 500,
        }
      );
    }

    // Retained package versions remain available to historical attempts.
    void existingPackageData;

    const history = await admin.from("attempts").select("id", { count: "exact", head: true }).eq("game_id", id);
    if (history.error) return NextResponse.json({ error: "Unable to check student attempt history." }, { status: 500 });


    const cleanFileName =
      safeFileName(
        fileValue.name
      ) ||
      "scorm-package.zip";

    newStoragePath =
      `${id}/source/${Date.now()}-${cleanFileName}`;

    const zipBuffer =
      Buffer.from(
        await fileValue.arrayBuffer()
      );

    /*
     * STEP 1:
     * Upload the candidate ZIP.
     *
     * Existing packages remain
     * untouched.
     */
    const {
      error: uploadError,
    } = await admin.storage
      .from("scorm-packages")
      .upload(
        newStoragePath,
        zipBuffer,
        {
          contentType:
            fileValue.type ||
            "application/zip",
          upsert: false,
        }
      );

    if (uploadError) {
      console.error(
        "Replacement ZIP upload failed:",
        uploadError
      );

      return NextResponse.json(
        {
          error:
            "Unable to upload the replacement SCORM package.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * STEP 2:
     * Create a separate candidate
     * package record.
     */
    const {
      data: newPackage,
      error: packageInsertError,
    } = await admin
      .from("scorm_packages")
      .insert({
        game_id: id,
        file_name:
          fileValue.name,
        storage_path:
          newStoragePath,
        package_size:
          fileValue.size,
        processing_status:
          "pending",
      })
      .select("id")
      .single();

    if (
      packageInsertError ||
      !newPackage
    ) {
      console.error(
        "Replacement package record creation failed:",
        packageInsertError
      );

      await admin.storage
        .from("scorm-packages")
        .remove([
          newStoragePath,
        ]);

      newStoragePath = null;

      return NextResponse.json(
        {
          error:
            "Unable to create the replacement SCORM package record.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Keep the nullable variable for
     * outer catch cleanup.
     */
    replacementPackageId =
      newPackage.id;

    /*
     * Keep a guaranteed string for
     * normal processing.
     */
    const confirmedPackageId =
      newPackage.id;

    /*
     * STEP 3:
     * Process and validate the
     * candidate package in its own
     * package-specific extraction
     * directory.
     */
    const processingResult =
      await processScormPackage({
        gameId: id,
        packageId:
          confirmedPackageId,
      });

    /*
     * STEP 4A:
     * Candidate failed.
     *
     * Restore the previous game
     * pointers and remove ONLY the
     * failed candidate.
     */
    if (
      !processingResult.success
    ) {
      const {
        error: restoreError,
      } = await admin
        .from("games")
        .update({
          scorm_version:
            game.scorm_version,
          launch_file:
            game.launch_file,
          package_path:
            game.package_path,
        })
        .eq("id", id);

      if (restoreError) {
        console.error(
          "Unable to restore previous SCORM pointers:",
          restoreError
        );
      }

      const failedExtractionPath =
        `${id}/packages/${confirmedPackageId}/extracted`;

      await removeStoragePrefix(
        admin,
        failedExtractionPath
      );

      if (newStoragePath) {
        const {
          error:
            failedZipRemoveError,
        } = await admin.storage
          .from("scorm-packages")
          .remove([
            newStoragePath,
          ]);

        if (
          failedZipRemoveError
        ) {
          console.error(
            "Unable to remove failed replacement ZIP:",
            failedZipRemoveError
          );
        }
      }

      const {
        error:
          failedRecordDeleteError,
      } = await admin
        .from("scorm_packages")
        .delete()
        .eq(
          "id",
          confirmedPackageId
        );

      if (
        failedRecordDeleteError
      ) {
        console.error(
          "Unable to remove failed replacement package row:",
          failedRecordDeleteError
        );
      }

      return NextResponse.json(
        {
          error:
            processingResult.error ||
            "The replacement SCORM package could not be processed.",
        },
        {
          status: 400,
        }
      );
    }

    const newExtractionPath =
      processingResult.extractionPath ||
      `${id}/packages/${confirmedPackageId}/extracted`;

    // Retain previous versions, including packages that may have been launched
    // concurrently with this replacement. New attempts use the game's active pointers.
    // Historical attempts stay bound to their original package ID.

    /*
     * STEP 5:
     * The replacement has succeeded.
     *
     * Update the parent game's timestamp
     * so Last Updated reflects this
     * successful SCORM change.
     *
     * A failed replacement never reaches
     * this point, so it does not change
     * the game's Last Updated value.
     */
    const updatedAt =
      new Date().toISOString();

    const {
      error: timestampUpdateError,
    } = await admin
      .from("games")
      .update({
        updated_at: updatedAt,
      })
      .eq("id", id);

    if (
      timestampUpdateError
    ) {
      console.error(
        "SCORM replacement succeeded but game timestamp update failed:",
        timestampUpdateError
      );
    }

    return NextResponse.json(
      {
        success: true,
        updated_at: updatedAt,
        package: {
          id:
            confirmedPackageId,
          file_name:
            fileValue.name,
          package_size:
            fileValue.size,
          scorm_version:
            processingResult.scormVersion,
          manifest_path:
            processingResult.manifestPath,
          launch_file:
            processingResult.launchFile,
          extraction_path:
            newExtractionPath,
          processing_status:
            "ready",
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "SCORM replacement route failed:",
      error
    );

    /*
     * Best-effort cleanup for a
     * candidate that failed because
     * of an unexpected exception.
     */
    try {
      const admin =
        createAdminClient();

      if (
        replacementPackageId
      ) {
        const { id } =
          await context.params;

        await removeStoragePrefix(
          admin,
          `${id}/packages/${replacementPackageId}/extracted`
        );

        await admin
          .from("scorm_packages")
          .delete()
          .eq(
            "id",
            replacementPackageId
          );
      }

      if (newStoragePath) {
        await admin.storage
          .from("scorm-packages")
          .remove([
            newStoragePath,
          ]);
      }
    } catch (
      cleanupError
    ) {
      console.error(
        "Replacement failure cleanup also failed:",
        cleanupError
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to replace the SCORM package.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * Delete every object below a
 * Supabase Storage directory prefix.
 */
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

    for (
      const childFolder
      of folders
    ) {
      await removeStorageFolder(
        admin,
        childFolder
      );
    }

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

    if (
      entries.length < limit
    ) {
      return;
    }
  }
}