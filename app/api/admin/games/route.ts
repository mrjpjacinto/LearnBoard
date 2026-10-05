import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processScormPackage } from "@/lib/scorm/process-package";

import { removeScormPrefix } from "@/lib/scorm/storage";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE =
  10 * 1024 * 1024;

const MAX_SCORM_SIZE =
  150 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(
  request: Request
) {
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
   * Creating a game includes uploading
   * and processing its SCORM package.
   *
   * SCORM package management is
   * restricted to Super Admin only.
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
          "Only a Super Admin can add games.",
      },
      {
        status: 403,
      }
    );
  }

  let formData: FormData;

  try {
    formData =
      await request.formData();
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to read the upload.",
      },
      {
        status: 400,
      }
    );
  }

  const nameValue =
    formData.get("name");

  const descriptionValue =
    formData.get(
      "description"
    );

  const subjectValue =
    formData.get(
      "subjectId"
    );

  const skillValue =
    formData.get("skillId");

  const imageValue =
    formData.get("image");

  const fileValue =
    formData.get("file");

  const name =
    typeof nameValue ===
    "string"
      ? nameValue.trim()
      : "";

  const description =
    typeof descriptionValue ===
    "string"
      ? descriptionValue.trim()
      : "";

  const subjectId =
    typeof subjectValue ===
    "string"
      ? subjectValue.trim()
      : "";

  const skillId =
    typeof skillValue ===
    "string"
      ? skillValue.trim()
      : "";

  if (!name) {
    return NextResponse.json(
      {
        error:
          "Game name is required.",
      },
      {
        status: 400,
      }
    );
  }

  if (name.length > 150) {
    return NextResponse.json(
      {
        error:
          "Game name cannot exceed 150 characters.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    description.length >
    1000
  ) {
    return NextResponse.json(
      {
        error:
          "Description cannot exceed 1000 characters.",
      },
      {
        status: 400,
      }
    );
  }

  if (!subjectId) {
    return NextResponse.json(
      {
        error:
          "Please select a subject.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !(imageValue instanceof File)
  ) {
    return NextResponse.json(
      {
        error:
          "Please upload a game image.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !ALLOWED_IMAGE_TYPES.includes(
      imageValue.type
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Game image must be JPG, PNG, or WebP.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    imageValue.size === 0
  ) {
    return NextResponse.json(
      {
        error:
          "The game image is empty.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    imageValue.size >
    MAX_IMAGE_SIZE
  ) {
    return NextResponse.json(
      {
        error:
          "Game image cannot exceed 10 MB.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !(fileValue instanceof File)
  ) {
    return NextResponse.json(
      {
        error:
          "Please upload a SCORM ZIP package.",
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

  if (
    fileValue.size === 0
  ) {
    return NextResponse.json(
      {
        error:
          "The SCORM ZIP package is empty.",
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

  const admin =
    createAdminClient();

  /*
   * Verify that the selected subject
   * exists and is active.
   */
  const {
    data: subject,
    error: subjectError,
  } = await admin
    .from("subjects")
    .select(
      "id, name, is_active"
    )
    .eq("id", subjectId)
    .maybeSingle();

  if (
    subjectError ||
    !subject
  ) {
    return NextResponse.json(
      {
        error:
          "The selected subject could not be found.",
      },
      {
        status: 400,
      }
    );
  }

  if (!subject.is_active) {
    return NextResponse.json(
      {
        error:
          "The selected subject is inactive.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * Skill is optional. If supplied,
   * verify both that it is active
   * and that it belongs to the
   * selected subject.
   */
  if (skillId) {
    const {
      data: skill,
      error: skillError,
    } = await admin
      .from("skills")
      .select(
        `
          id,
          subject_id,
          is_active
        `
      )
      .eq("id", skillId)
      .maybeSingle();

    if (
      skillError ||
      !skill
    ) {
      return NextResponse.json(
        {
          error:
            "The selected skill could not be found.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      skill.subject_id !==
      subjectId
    ) {
      return NextResponse.json(
        {
          error:
            "The selected skill does not belong to this subject.",
        },
        {
          status: 400,
        }
      );
    }

    if (!skill.is_active) {
      return NextResponse.json(
        {
          error:
            "The selected skill is inactive.",
        },
        {
          status: 400,
        }
      );
    }
  }

  /*
   * Create the game first so its ID
   * can be used for both Storage
   * locations.
   */
  const {
    data: game,
    error: gameError,
  } = await admin
    .from("games")
    .insert({
      name,
      description:
        description || null,
      status: "draft",
      subject_id:
        subjectId,
      skill_id:
        skillId || null,
      created_by:
        user.id,
    })
    .select(
      `
        id,
        name,
        description,
        status,
        subject_id,
        skill_id,
        image_path
      `
    )
    .single();

  if (
    gameError ||
    !game
  ) {
    return NextResponse.json(
      {
        error:
          gameError?.message ||
          "Unable to create the game.",
      },
      {
        status: 500,
      }
    );
  }

  const extension =
    getImageExtension(
      imageValue
    );

  const imagePath =
    `${game.id}/cover.${extension}`;

  let imageUploaded = false;

  try {
    /*
     * Upload the visual card image.
     */
    const imageBuffer =
      Buffer.from(
        await imageValue.arrayBuffer()
      );

    const {
      error:
        imageUploadError,
    } = await admin.storage
      .from("game-images")
      .upload(
        imagePath,
        imageBuffer,
        {
          contentType:
            imageValue.type,
          upsert: true,
        }
      );

    if (imageUploadError) {
      throw new Error(
        `Unable to upload game image: ${imageUploadError.message}`
      );
    }

    imageUploaded = true;

    const {
      error:
        imageUpdateError,
    } = await admin
      .from("games")
      .update({
        image_path:
          imagePath,
      })
      .eq("id", game.id);

    if (imageUpdateError) {
      throw new Error(
        `Unable to save game image: ${imageUpdateError.message}`
      );
    }

    /*
     * Store the original SCORM ZIP.
     */
    const safeZipName =
      fileValue.name
        .replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

    const zipStoragePath =
      `${game.id}/source/${Date.now()}-${safeZipName}`;

    const zipBuffer =
      Buffer.from(
        await fileValue.arrayBuffer()
      );

    const {
      error: zipUploadError,
    } = await admin.storage
      .from("scorm-packages")
      .upload(
        zipStoragePath,
        zipBuffer,
        {
          contentType:
            fileValue.type ||
            "application/zip",
          upsert: false,
        }
      );

    if (zipUploadError) {
      throw new Error(
        `Unable to upload SCORM package: ${zipUploadError.message}`
      );
    }

    /*
     * Save the original filename and
     * package size so Game Management
     * can display both immediately.
     */
    const {
      data: packageRecord,
      error: packageRecordError,
    } = await admin
      .from("scorm_packages")
      .insert({
        game_id: game.id,
        file_name:
          fileValue.name,
        storage_path:
          zipStoragePath,
        package_size:
          fileValue.size,
        processing_status:
          "pending",
      })
      .select("id")
      .single();

    if (
      packageRecordError ||
      !packageRecord
    ) {
      await admin.storage
        .from("scorm-packages")
        .remove([
          zipStoragePath,
        ]);

      throw new Error(
        packageRecordError?.message ||
          "Unable to create the SCORM package record."
      );
    }

    const processed =
      await processScormPackage({
        gameId: game.id,
        packageId:
          packageRecord.id,
      });

    if (!processed.success) {
      throw new Error(
        processed.error ||
          "SCORM package processing failed."
      );
    }

    return NextResponse.json(
      {
        game: {
          ...game,
          image_path:
            imagePath,
        },
        package: processed,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    /*
     * Creation is transactional from
     * the user's point of view:
     * remove files and database rows
     * when processing fails so a
     * broken draft is not left behind.
     */
    if (imageUploaded) {
      await admin.storage
        .from("game-images")
        .remove([
          imagePath,
        ]);
    }

    /*
     * The SCORM processor may have
     * created package records/files
     * before discovering an invalid
     * package. Clean database records
     * associated with this game.
     */
    try { await removeScormPrefix(admin, game.id); } catch (cleanupError) { console.error("Failed game package cleanup:", cleanupError); }

    await admin
      .from("scorm_packages")
      .delete()
      .eq("game_id", game.id);

    await admin
      .from("games")
      .delete()
      .eq("id", game.id);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process the game.",
      },
      {
        status: 400,
      }
    );
  }
}

function getImageExtension(
  file: File
) {
  switch (file.type) {
    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return "jpg";
  }
}