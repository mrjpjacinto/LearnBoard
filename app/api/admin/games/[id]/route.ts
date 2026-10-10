import { LmsError, apiError } from "@/lib/lms/auth";
import { parseSkillIds } from "@/lib/lms/game-skills";
import { validateGameSkills, saveGameSkills } from "@/lib/lms/game-skills-server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const MAX_IMAGE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function PATCH(
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

    // Global game information is managed only by Super Admin.
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
      profile.role !== "super_admin"
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to edit games.",
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
     * game actually exists.
     */
    const {
      data: existingGame,
      error: gameError,
    } = await admin
      .from("games")
      .select(
        "id, image_path, subject_id"
      )
      .eq("id", id)
      .maybeSingle();

    if (gameError) {
      console.error(
        "Unable to load game:",
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

    if (!existingGame) {
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

    const formData =
      await request.formData();

    const nameValue =
      formData.get("name");

    const descriptionValue =
      formData.get(
        "description"
      );

    let skillIds:string[];
    try {skillIds=parseSkillIds(formData,"skill_id");}catch{throw new LmsError("Choose at least one valid skill.");}
    const skillId = skillIds[0];
    const classifications = await validateGameSkills(admin,skillIds);




    const imageValue =
      formData.get("image");

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

    const subjectId = classifications.primary.subject_id;


    const orientationMode = "landscape";

    /*
     * Validate only the fields this
     * endpoint is allowed to edit.
     */
    if (!name) {
      return NextResponse.json(
        {
          error:
            "Game title is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (name.length > 150 || description.length > 1000) return NextResponse.json({ error: "The game title or description is too long." }, { status: 400 });

    if (!subjectId) {
      return NextResponse.json(
        {
          error:
            "Subject is required.",
        },
        {
          status: 400,
        }
      );
    }



    /*
     * Verify that the selected subject
     * exists and is active.
     */
    const {
      data: subject,
      error: subjectError,
    } = await admin
      .from("subjects")
      .select("id")
      .eq("id", subjectId)
      .eq("is_active", true)
      .maybeSingle();

    if (
      subjectError ||
      !subject
    ) {
      return NextResponse.json(
        {
          error:
            "The selected subject is not available.",
        },
        {
          status: 400,
        }
      );
    }

    let newImagePath:
      | string
      | null = null;

    /*
     * Image is optional during editing.
     * If no new image is supplied, keep
     * the existing one.
     */
    if (
      imageValue instanceof
        File &&
      imageValue.size > 0
    ) {
      if (
        !ALLOWED_IMAGE_TYPES.includes(
          imageValue.type
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Game image must be a JPG, PNG, or WebP file.",
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
              "Game image must be 10 MB or smaller.",
          },
          {
            status: 400,
          }
        );
      }

      const extension =
        getImageExtension(
          imageValue
        );

      newImagePath =
        `${id}/${crypto.randomUUID()}.${extension}`;

      const {
        error: uploadError,
      } = await admin.storage
        .from("game-images")
        .upload(
          newImagePath,
          imageValue,
          {
            contentType:
              imageValue.type,
            upsert: false,
          }
        );

      if (uploadError) {
        console.error(
          "Unable to upload replacement game image:",
          uploadError
        );

        return NextResponse.json(
          {
            error:
              "Unable to upload the game image.",
          },
          {
            status: 500,
          }
        );
      }
    }

    const updateValues: {
      name: string;
      description:
        | string
        | null;
      subject_id: string;
      skill_id: string;
      orientation_mode: string;
      image_path?: string;
      updated_at: string;
    } = {
      name,
      description:
        description || null,
      subject_id: subjectId,
      skill_id: skillId,
      orientation_mode:
        orientationMode,
      updated_at:
        new Date().toISOString(),
    };



    if (newImagePath) {
      updateValues.image_path =
        newImagePath;
    }

    const {
      data: updatedGame,
      error: updateError,
    } = await saveGameSkills(admin,id,skillIds,updateValues,classifications.enabled);

    if (updateError) {
      /*
       * If the database update fails
       * after a new image was uploaded,
       * remove that new unused image.
       */
      if (newImagePath) {
        const {
          error:
            cleanupError,
        } = await admin.storage
          .from(
            "game-images"
          )
          .remove([
            newImagePath,
          ]);

        if (cleanupError) {
          console.error(
            "Unable to clean up unused replacement image:",
            cleanupError
          );
        }
      }

      console.error(
        "Unable to update game:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Unable to save the game changes.",
        },
        {
          status: 500,
        }
      );
    }

    if (!updatedGame) {
      if (newImagePath) {
        await admin.storage
          .from("game-images")
          .remove([
            newImagePath,
          ]);
      }

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
     * The database now references the
     * new image, so the previous image
     * can safely be removed.
     */
    if (
      newImagePath &&
      existingGame.image_path &&
      existingGame.image_path !==
        newImagePath
    ) {
      const {
        error:
          oldImageRemoveError,
      } = await admin.storage
        .from("game-images")
        .remove([
          existingGame.image_path,
        ]);

      if (
        oldImageRemoveError
      ) {
        console.error(
          "Game updated but old image cleanup failed:",
          oldImageRemoveError
        );
      }
    }

    return NextResponse.json({
      success: true,
      game: updatedGame,
    });
  } catch (error) {
    if(error instanceof LmsError)return apiError(error);
    console.error(
      "Unexpected game update error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to save the game changes.",
      },
      {
        status: 500,
      }
    );
  }
}

function getImageExtension(
  file: File
) {
  if (
    file.type ===
    "image/png"
  ) {
    return "png";
  }

  if (
    file.type ===
    "image/webp"
  ) {
    return "webp";
  }

  return "jpg";
}
