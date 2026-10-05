"use client";
import { Notification } from "./LmsToast";
import ActionIcon from "@/components/ActionIcon";


import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import DeleteGameDangerZone from "@/components/DeleteGameDangerZone";

type Subject = {
  id: string;
  name: string;
};

type Game = {
  id: string;
  name: string;
  description: string | null;
  subject_id: string | null;
  orientation_mode: string;
  image_path: string | null;
};

type GameEditFormProps = {
  game: Game;
  subjects: Subject[];
  isSuperAdmin?: boolean;
};

const MAX_IMAGE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function GameEditForm({
  game,
  subjects,
  isSuperAdmin = false,
}: GameEditFormProps) {
  const router = useRouter();

  const [name, setName] =
    useState(game.name);

  const [
    description,
    setDescription,
  ] = useState(
    game.description || ""
  );

  const [
    subjectId,
    setSubjectId,
  ] = useState(
    game.subject_id || ""
  );

  const [
    orientationMode,
    setOrientationMode,
  ] = useState(
    game.orientation_mode ||
      "landscape"
  );

  const [image, setImage] =
    useState<File | null>(null);

  const [
    imagePreview,
    setImagePreview,
  ] = useState("");

  const [saving, setSaving] =
    useState(false);

  const [success, setSuccess] =
    useState("");

  const [error, setError] =
    useState("");

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        setSuccess("");
      }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [success]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        setError("");
      }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [error]);

  const existingImageUrl =
    useMemo(() => {
      if (!game.image_path) {
        return "";
      }

      if (
        game.image_path.startsWith(
          "http://"
        ) ||
        game.image_path.startsWith(
          "https://"
        )
      ) {
        return game.image_path;
      }

      const supabaseUrl =
        process.env
          .NEXT_PUBLIC_SUPABASE_URL;

      if (!supabaseUrl) {
        return "";
      }

      return `${supabaseUrl}/storage/v1/object/public/game-images/${game.image_path}`;
    }, [game.image_path]);

  const displayedImage =
    imagePreview ||
    existingImageUrl;

  function handleImageChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const selected =
      event.target.files?.[0];

    if (!selected) {
      return;
    }

    setError("");
    setSuccess("");

    if (
      !ALLOWED_IMAGE_TYPES.includes(
        selected.type
      )
    ) {
      setError(
        "Game image must be JPG, PNG, or WebP."
      );

      event.target.value = "";
      return;
    }

    if (selected.size === 0) {
      setError(
        "The selected image is empty."
      );

      event.target.value = "";
      return;
    }

    if (
      selected.size >
      MAX_IMAGE_SIZE
    ) {
      setError(
        "Game image cannot exceed 10 MB."
      );

      event.target.value = "";
      return;
    }

    setImage(selected);

    const reader =
      new FileReader();

    reader.onload = () => {
      if (
        typeof reader.result ===
        "string"
      ) {
        setImagePreview(
          reader.result
        );
      }
    };

    reader.readAsDataURL(
      selected
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");
    setSuccess("");

    const cleanName =
      name.trim();

    const cleanDescription =
      description.trim();

    if (!cleanName) {
      setError(
        "Game title is required."
      );
      return;
    }

    if (
      cleanName.length > 150
    ) {
      setError(
        "Game title cannot exceed 150 characters."
      );
      return;
    }

    if (
      cleanDescription.length >
      1000
    ) {
      setError(
        "Description cannot exceed 1000 characters."
      );
      return;
    }

    if (!subjectId) {
      setError(
        "Please select a subject."
      );
      return;
    }

    if (
      orientationMode !==
        "landscape" &&
      orientationMode !==
        "portrait"
    ) {
      setError(
        "Please select a valid orientation mode."
      );
      return;
    }

    setSaving(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "name",
        cleanName
      );

      formData.append(
        "description",
        cleanDescription
      );

      /*
       * These names intentionally
       * match the PATCH API.
       */
      formData.append(
        "subject_id",
        subjectId
      );

      formData.append(
        "orientation_mode",
        orientationMode
      );

      if (image) {
        formData.append(
          "image",
          image
        );
      }

      const response =
        await fetch(
          `/api/admin/games/${game.id}`,
          {
            method: "PATCH",
            body: formData,
          }
        );

      const responseText =
        await response.text();

      let result: {
        error?: string;
        success?: boolean;
      } = {};

      if (responseText) {
        try {
          result =
            JSON.parse(
              responseText
            );
        } catch {
          if (!response.ok) {
            throw new Error(
              `Unable to save the game. The server returned an unexpected response (${response.status}).`
            );
          }

          throw new Error(
            "The game was saved, but the server returned an unexpected response."
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            `Unable to save the game (${response.status}).`
        );
      }

      setSuccess(
        "Game changes saved successfully."
      );

      setImage(null);
      setImagePreview("");

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the game."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="stack-layout"
    >
      {error ? <Notification type="error" message={error} onClose={() => setError("")} /> : success ? <Notification type="success" message={success} onClose={() => setSuccess("")} /> : null}

      <div className="rounded-2xl border border-[#E3E8F2] bg-white shadow-sm">
        <div className="border-b border-[#E8ECF4] px-6 py-5">
          <h2 className="text-lg font-bold text-[#172033]">
            Game Information
          </h2>

          <p className="mt-1 text-sm leading-6 text-[#667085]">
            Update the information
            shown for this game.
          </p>
        </div>

        <div className="stack-layout p-6">
          <div>
            <label
              htmlFor="game-title"
              className="mb-2 block text-sm font-semibold text-[#344054]"
            >
              Game Title
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <input
              id="game-title"
              type="text"
              value={name}
              maxLength={150}
              disabled={saving}
              onChange={(
                event
              ) => {
                setName(
                  event.target.value
                );
                setError("");
                setSuccess("");
              }}
              className="h-12 w-full rounded-xl border border-[#D8DEEA] bg-white px-4 text-sm text-[#172033] outline-none transition focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10 disabled:bg-[#F8FAFC]"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label
                htmlFor="game-description"
                className="text-sm font-semibold text-[#344054]"
              >
                Description
              </label>

              <span className="text-xs text-[#98A2B3]">
                {description.length}
                /1000
              </span>
            </div>

            <textarea
              id="game-description"
              value={description}
              maxLength={1000}
              rows={5}
              disabled={saving}
              onChange={(
                event
              ) => {
                setDescription(
                  event.target.value
                );
                setError("");
                setSuccess("");
              }}
              placeholder="Add a description for this game"
              className="w-full resize-none rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 text-sm leading-6 text-[#172033] outline-none transition placeholder:text-[#98A2B3] focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10 disabled:bg-[#F8FAFC]"
            />
          </div>

          <div className="grid gap-layout md:grid-cols-2">
            <div>
              <label
                htmlFor="game-subject"
                className="mb-2 block text-sm font-semibold text-[#344054]"
              >
                Subject
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                id="game-subject"
                value={subjectId}
                disabled={saving}
                onChange={(
                  event
                ) => {
                  setSubjectId(
                    event.target.value
                  );
                  setError("");
                  setSuccess("");
                }}
                className="h-12 w-full rounded-xl border border-[#D8DEEA] bg-white px-4 text-sm text-[#172033] outline-none transition focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10 disabled:bg-[#F8FAFC]"
              >
                <option value="">
                  Select a subject
                </option>

                {subjects.map(
                  (subject) => (
                    <option
                      key={
                        subject.id
                      }
                      value={
                        subject.id
                      }
                    >
                      {
                        subject.name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="orientation-mode"
                className="mb-2 block text-sm font-semibold text-[#344054]"
              >
                Orientation Mode
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                id="orientation-mode"
                value={
                  orientationMode
                }
                disabled={saving}
                onChange={(
                  event
                ) => {
                  setOrientationMode(
                    event.target.value
                  );
                  setError("");
                  setSuccess("");
                }}
                className="h-12 w-full rounded-xl border border-[#D8DEEA] bg-white px-4 text-sm text-[#172033] outline-none transition focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10 disabled:bg-[#F8FAFC]"
              >
                <option value="landscape">
                  Landscape
                </option>

                <option value="portrait">
                  Portrait
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E3E8F2] bg-white shadow-sm">
        <div className="border-b border-[#E8ECF4] px-6 py-5">
          <h2 className="text-lg font-bold text-[#172033]">
            Game Image
          </h2>

          <p className="mt-1 text-sm leading-6 text-[#667085]">
            Change the artwork shown
            for this game.
          </p>
        </div>

        <div className="p-6">
          <div className="grid gap-layout lg:grid-cols-[300px_minmax(0,1fr)] lg:items-center">
            <div className="overflow-hidden rounded-2xl border border-[#E3E8F2] bg-[#F8FAFC]">
              <div className="aspect-[4/3]">
                {displayedImage ? (
                  <img
                    src={
                      displayedImage
                    }
                    alt={`${name} artwork`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm font-medium text-[#98A2B3]">
                    No game image
                  </div>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="game-image"
                className="mb-2 block text-sm font-semibold text-[#344054]"
              >
                Replace Game Image
              </label>

              <input
                ref={fileInputRef}
                id="game-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={saving}
                onChange={
                  handleImageChange
                }
                className="block w-full rounded-xl border border-[#D8DEEA] bg-white p-3 text-sm text-[#475467] file:mr-4 file:rounded-lg file:border-0 file:bg-[#EEF0FF] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#4F46E5] hover:file:bg-[#E4E7FF] disabled:opacity-60"
              />

              <p className="mt-2 text-xs leading-5 text-[#98A2B3]">
                JPG, PNG or WebP.
                Maximum 10 MB.
                Recommended image ratio:
                4:3 landscape. Leave this
                unchanged to keep the
                current image.
              </p>

              {image && (
                <p className="mt-3 text-sm font-semibold text-[#344054]">
                  Selected:{" "}
                  {image.name}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {isSuperAdmin && (
          <DeleteGameDangerZone
            gameId={game.id}
            gameName={game.name}
            compact
          />
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-12 items-center justify-center rounded-xl bg-[#6366F1] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#818CF8] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        ><ActionIcon name="save" />
          {saving
            ? "Saving..."
            : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function CloseIcon() { return <ActionIcon name="close" />; }