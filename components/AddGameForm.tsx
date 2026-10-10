"use client";
import GameSkillsPicker from "./GameSkillsPicker";
import { showToast } from "./LmsToast";
import { Notification } from "./LmsToast";
import ActionIcon from "@/components/ActionIcon";
import { addButtonClass } from "@/lib/ui/buttons";


import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const MAX_FILE_SIZE =
  150 * 1024 * 1024;

const MAX_IMAGE_SIZE =
  10 * 1024 * 1024;

type SubjectRow = {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

type SkillRow = {
  id: string;
  subject_id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

type AddGameFormProps = {
  subjects: SubjectRow[];
  skills: SkillRow[];
};

type FieldErrors = {
  image?: string;
  subject?: string;
  name?: string;
  file?: string;
};

export default function AddGameForm({
  subjects,
  skills,
}: AddGameFormProps) {
  const router = useRouter();

  const imageSectionRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const subjectSectionRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const nameSectionRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const fileSectionRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const imageInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const subjectInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const nameInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [image, setImage] =
    useState<File | null>(null);

  const [
    imagePreview,
    setImagePreview,
  ] = useState("");



  const [skillIds,setSkillIds] = useState<string[]>([]);
  const skillId=skillIds[0] || "";
  const subjectId=skills.find(skill=>skill.id===skillId)?.subject_id || "";

  const [name, setName] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [file, setFile] =
    useState<File | null>(null);

  const [dragging, setDragging] =
    useState(false);

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState<FieldErrors>({});

  const [
    serverError,
    setServerError,
  ] = useState("");

  const [uploading, setUploading] =
    useState(false);



  function clearFieldError(
    field: keyof FieldErrors
  ) {
    setFieldErrors(
      (current) => {
        if (!current[field]) {
          return current;
        }

        const next = {
          ...current,
        };

        delete next[field];

        return next;
      }
    );
  }

  function validateImage(
    selectedFile: File
  ) {
    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(selectedFile.type)
    ) {
      return "Game image must be JPG, PNG, or WebP.";
    }

    if (
      selectedFile.size <= 0
    ) {
      return "The selected image is empty.";
    }

    if (
      selectedFile.size >
      MAX_IMAGE_SIZE
    ) {
      return "Game image cannot exceed 10 MB.";
    }

    return "";
  }

  function selectImage(
    selectedFile:
      | File
      | undefined
  ) {
    if (!selectedFile) {
      return;
    }

    const validationError =
      validateImage(selectedFile);

    if (validationError) {
      setImage(null);
      setImagePreview("");

      setFieldErrors(
        (current) => ({
          ...current,
          image:
            validationError,
        })
      );

      if (
        imageInputRef.current
      ) {
        imageInputRef.current.value =
          "";
      }

      return;
    }

    /*
     * Clear any previous preview first.
     * The new preview is shown only after
     * FileReader has produced a valid
     * non-empty data URL.
     */
    setImagePreview("");
    setImage(selectedFile);
    clearFieldError("image");
    setServerError("");

    const reader =
      new FileReader();

    reader.onload = () => {
      if (
        typeof reader.result ===
          "string" &&
        reader.result.length > 0
      ) {
        setImagePreview(
          reader.result
        );
      } else {
        setImagePreview("");
      }
    };

    reader.onerror = () => {
      setImagePreview("");

      setFieldErrors(
        (current) => ({
          ...current,
          image:
            "Unable to preview the selected image. Please choose a different image.",
        })
      );
    };

    reader.readAsDataURL(
      selectedFile
    );
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    selectImage(
      event.target.files?.[0]
    );
  }

  function removeImage() {
    if (uploading) {
      return;
    }

    setImage(null);
    setImagePreview("");

    setFieldErrors(
      (current) => ({
        ...current,
        image:
          "Please upload a game image.",
      })
    );

    if (
      imageInputRef.current
    ) {
      imageInputRef.current.value =
        "";
    }
  }

  function validateFile(
    selectedFile: File
  ) {
    const lowerName =
      selectedFile.name.toLowerCase();

    if (
      !lowerName.endsWith(".zip")
    ) {
      return "Please select a ZIP file.";
    }

    if (
      selectedFile.size <= 0
    ) {
      return "The selected ZIP file is empty.";
    }

    if (
      selectedFile.size >
      MAX_FILE_SIZE
    ) {
      return "The SCORM package cannot exceed 150 MB.";
    }

    return "";
  }

  function selectFile(
    selectedFile:
      | File
      | undefined
  ) {
    if (!selectedFile) {
      return;
    }

    const validationError =
      validateFile(selectedFile);

    if (validationError) {
      setFile(null);

      setFieldErrors(
        (current) => ({
          ...current,
          file:
            validationError,
        })
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      return;
    }

    setFile(selectedFile);
    clearFieldError("file");
    setServerError("");
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    selectFile(
      event.target.files?.[0]
    );
  }

  function handleDragOver(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setDragging(false);
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setDragging(false);

    selectFile(
      event.dataTransfer
        .files?.[0]
    );
  }

  function removeFile() {
    if (uploading) {
      return;
    }

    setFile(null);

    setFieldErrors(
      (current) => ({
        ...current,
        file:
          "Please select a SCORM ZIP package.",
      })
    );

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }

  function scrollToFirstError(
    errors: FieldErrors
  ) {
    const firstError =
      (
        [
          "image",
          "subject",
          "name",
          "file",
        ] as const
      ).find(
        (field) =>
          Boolean(errors[field])
      );

    if (!firstError) {
      return;
    }

    const sections = {
      image:
        imageSectionRef.current,
      subject:
        subjectSectionRef.current,
      name:
        nameSectionRef.current,
      file:
        fileSectionRef.current,
    };

    const target =
      sections[firstError];

    window.setTimeout(() => {
      target?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      window.setTimeout(() => {
        if (
          firstError ===
          "subject"
        ) {
          subjectInputRef.current?.focus();
        }

        if (
          firstError === "name"
        ) {
          nameInputRef.current?.focus();
        }
      }, 450);
    }, 50);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (uploading) {
      return;
    }

    const cleanName =
      name.trim();

    const cleanDescription =
      description.trim();

    const nextErrors:
      FieldErrors = {};

    if (!image) {
      nextErrors.image =
        "Please upload a game image.";
    } else {
      const imageError =
        validateImage(image);

      if (imageError) {
        nextErrors.image =
          imageError;
      }
    }

    if (!subjectId) {
      nextErrors.subject =
        "Please select a subject.";
    }

    if (!cleanName) {
      nextErrors.name =
        "Please enter a game name.";
    }

    if (!file) {
      nextErrors.file =
        "Please select a SCORM ZIP package.";
    } else {
      const fileError =
        validateFile(file);

      if (fileError) {
        nextErrors.file =
          fileError;
      }
    }

    setFieldErrors(nextErrors);
    setServerError("");

    if (
      Object.keys(nextErrors)
        .length > 0
    ) {
      scrollToFirstError(
        nextErrors
      );

      return;
    }

    if (!image || !file) {
      return;
    }

    setUploading(true);

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

      formData.append(
        "subjectId",
        subjectId
      );

      skillIds.forEach(id=>formData.append("skill_ids",id));

      formData.append(
        "image",
        image
      );

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/admin/games",
          {
            method: "POST",
            body: formData,
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to add the game."
        );
      }

      router.push(
        "/admin/games"
      );

      showToast({ type: "success", message: "Game uploaded and available." });

      router.refresh();
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Unable to add the game."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="stack-layout"
    >
      <div
        ref={imageSectionRef}
        className="scroll-mt-8"
      >
        <label className="mb-2 block text-sm font-semibold text-[#344054]">
          Game Image{" "}
          <span className="text-red-600">
            *
          </span>
        </label>

        <p className="mb-3 text-xs leading-5 text-[#98A2B3]">
          Upload the artwork shown
          on the game card. JPG, PNG
          or WebP · Maximum 10 MB.
        </p>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          onChange={
            handleImageChange
          }
          className="hidden"
        />

        {!image ? (
          <button
            type="button"
            disabled={uploading}
            onClick={() =>
              imageInputRef.current?.click()
            }
            className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
              fieldErrors.image
                ? "border-red-400 bg-red-50/40 hover:border-red-500 hover:bg-red-50"
                : "border-[#D8DEEA] bg-[#FAFBFD] hover:border-[#A5B4FC] hover:bg-[#F8F8FF]"
            }`}
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                fieldErrors.image
                  ? "bg-red-100 text-red-600"
                  : "bg-[#EEF0FF] text-[#6366F1]"
              }`}
            >
              <ImageIcon />
            </div>

            <p className="mt-4 text-sm font-semibold text-[#344054]">
              Upload game image
            </p>

            <p className="mt-1 text-sm text-[#667085]">
              Click to browse your
              computer
            </p>
          </button>
        ) : (
          <div
            className={`overflow-hidden rounded-2xl border ${
              fieldErrors.image
                ? "border-red-400 bg-red-50/40"
                : "border-[#DDE1FF] bg-[#F8F8FF]"
            }`}
          >
            <div className="grid gap-layout p-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Game artwork preview"
                  className="aspect-[4/3] w-full rounded-xl object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-[#EEF0FF] text-[#6366F1]">
                  <ImageIcon />
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#172033]">
                  {image.name}
                </p>

                <p className="mt-1 text-xs text-[#667085]">
                  {formatFileSize(
                    image.size
                  )}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={
                      uploading
                    }
                    onClick={() =>
                      imageInputRef.current?.click()
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D8DEEA] bg-[#EEF0FF] px-3 py-2 text-xs font-semibold text-[#4F46E5] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
                  ><ActionIcon name="next" />
                    Change image
                  </button>

                  <button
                    type="button"
                    disabled={
                      uploading
                    }
                    onClick={
                      removeImage
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-100 bg-[#EEF0FF] px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  ><ActionIcon name="delete" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {fieldErrors.image && (
          <FieldError>
            {fieldErrors.image}
          </FieldError>
        )}
      </div>

      <div className="grid gap-layout md:grid-cols-2">
        <div className="col-span-full"><GameSkillsPicker inputRef={subjectInputRef} subjects={subjects} skills={skills} value={skillIds} onChange={ids=>{setSkillIds(ids);clearFieldError("subject");setServerError("");}} disabled={uploading} />{fieldErrors.subject && <FieldError>{fieldErrors.subject}</FieldError>}</div>
      </div>

      <div
        ref={nameSectionRef}
        className="scroll-mt-8"
      >
        <label
          htmlFor="game-name"
          className="mb-2 block text-sm font-semibold text-[#344054]"
        >
          Game Name{" "}
          <span className="text-red-600">
            *
          </span>
        </label>

        <input
          ref={nameInputRef}
          id="game-name"
          type="text"
          value={name}
          aria-invalid={
            Boolean(
              fieldErrors.name
            )
          }
          onChange={(event) => {
            setName(
              event.target.value
            );

            if (
              event.target.value.trim()
            ) {
              clearFieldError(
                "name"
              );
            }

            setServerError("");
          }}
          disabled={uploading}
          maxLength={150}
          placeholder="Example: Multiplication Race"
          className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#172033] outline-none transition placeholder:text-[#98A2B3] focus:ring-4 disabled:bg-slate-50 disabled:opacity-70 ${
            fieldErrors.name
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-[#D8DEEA] focus:border-[#818CF8] focus:ring-[#6366F1]/10"
          }`}
        />

        {fieldErrors.name && (
          <FieldError>
            {fieldErrors.name}
          </FieldError>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            htmlFor="game-description"
            className="text-sm font-semibold text-[#344054]"
          >
            Description
          </label>

          <span className="text-xs text-[#98A2B3]">
            Optional
          </span>
        </div>

        <textarea
          id="game-description"
          value={description}
          onChange={(event) =>
            setDescription(
              event.target.value
            )
          }
          disabled={uploading}
          maxLength={1000}
          rows={4}
          placeholder="Short description of the game..."
          className="w-full resize-none rounded-xl border border-[#D8DEEA] bg-white px-4 py-3 text-sm text-[#172033] outline-none transition placeholder:text-[#98A2B3] focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10 disabled:bg-slate-50 disabled:opacity-70"
        />

        <div className="mt-2 flex justify-end">
          <span className="text-xs text-[#98A2B3]">
            {description.length}
            /1000
          </span>
        </div>
      </div>

      <div
        ref={fileSectionRef}
        className="scroll-mt-8"
      >
        <label className="mb-2 block text-sm font-semibold text-[#344054]">
          SCORM ZIP Package{" "}
          <span className="text-red-600">
            *
          </span>
        </label>

        {!file ? (
          <div
            onDragOver={
              uploading
                ? undefined
                : handleDragOver
            }
            onDragLeave={
              uploading
                ? undefined
                : handleDragLeave
            }
            onDrop={
              uploading
                ? undefined
                : handleDrop
            }
            onClick={() => {
              if (!uploading) {
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (
                !uploading &&
                (event.key ===
                  "Enter" ||
                  event.key === " ")
              ) {
                event.preventDefault();

                fileInputRef.current?.click();
              }
            }}
            className={`rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
              uploading
                ? "cursor-not-allowed border-[#D8DEEA] bg-[#FAFBFD] opacity-60"
                : fieldErrors.file
                  ? "cursor-pointer border-red-400 bg-red-50/40 hover:border-red-500 hover:bg-red-50"
                  : dragging
                    ? "cursor-pointer border-[#6366F1] bg-[#F5F5FF]"
                    : "cursor-pointer border-[#D8DEEA] bg-[#FAFBFD] hover:border-[#A5B4FC] hover:bg-[#F8F8FF]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              disabled={uploading}
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={
                handleFileChange
              }
              className="hidden"
            />

            <div
              className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
                fieldErrors.file
                  ? "bg-red-100 text-red-600"
                  : "bg-[#EEF0FF] text-[#6366F1]"
              }`}
            >
              <UploadIcon />
            </div>

            <p className="mt-4 text-sm font-semibold text-[#344054]">
              Drop your SCORM ZIP here
            </p>

            <p className="mt-1 text-sm text-[#667085]">
              or click to browse your
              computer
            </p>

            <p className="mt-3 text-xs text-[#98A2B3]">
              ZIP files only · Maximum
              150 MB
            </p>
          </div>
        ) : (
          <div
            className={`rounded-2xl border p-4 ${
              fieldErrors.file
                ? "border-red-400 bg-red-50/40"
                : "border-[#DDE1FF] bg-[#F8F8FF]"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#6366F1]">
                <PackageIcon />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#172033]">
                  {file.name}
                </p>

                <p className="mt-1 text-xs text-[#667085]">
                  {formatFileSize(
                    file.size
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={removeFile}
                disabled={uploading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition hover:bg-[#EEF0FF] hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Remove selected file"
              >
                <TrashIcon />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-[#E3E6FF] pt-3 text-xs font-medium text-[#4F46E5]">
              <CheckIcon />

              {uploading
                ? "Uploading and validating package..."
                : "Ready for package validation"}
            </div>
          </div>
        )}

        {fieldErrors.file && (
          <FieldError>
            {fieldErrors.file}
          </FieldError>
        )}
      </div>

      <div className="rounded-xl border border-[#E3E8F2] bg-[#FAFBFD] p-4">
        <div className="flex gap-3">
          <div className="mt-0.5 shrink-0 text-[#6366F1]">
            <InfoIcon />
          </div>

          <div>
            <p className="text-sm font-semibold text-[#344054]">
              What happens after
              upload?
            </p>

            <p className="mt-1 text-xs leading-5 text-[#667085]">
              LumenTrail stores the
              original package
              privately, checks its
              manifest and SCORM
              version, verifies the
              launch file and extracts
              the package. The game is
              available after its SCORM package passes validation.
            </p>
          </div>
        </div>
      </div>

      {serverError && <Notification type="error" message={serverError} onClose={() => setServerError("")} />}

      <div className="flex flex-col-reverse gap-3 border-t border-[#E8ECF4] pt-6 sm:flex-row sm:justify-end">
        <Link
          href="/admin/games"
          aria-disabled={
            uploading
          }
          className={("inline-flex items-center gap-2 " + ((`inline-flex h-12 items-center justify-center rounded-xl border border-[#D8DEEA] bg-[#EEF0FF] px-5 text-sm font-semibold text-[#4F46E5] transition ${
            uploading
              ? "pointer-events-none opacity-50"
              : "hover:bg-[#F8FAFC]"
          }`) + " !border-red-200 !bg-red-50 !text-red-700 hover:!bg-red-100 focus-visible:!outline-red-500 focus:!ring-red-200"))}
        ><ActionIcon name="close" className="inline-block h-4 w-4 shrink-0 align-middle mr-2" />
          Cancel
        </Link>

        <button
          type="submit"
          disabled={uploading}
          className={addButtonClass}
        >
          {uploading ? (
            <>
              <SpinnerIcon />
              Uploading Game...
            </>
          ) : (
            <>
              <PlusIcon />
              Add Game
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function FieldError({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p
      role="alert"
      className="mt-2 flex items-center gap-1.5 text-sm font-medium text-red-600"
    >
      <ErrorIcon />
      {children}
    </p>
  );
}

function formatFileSize(
  bytes: number
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes =
    bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(
      1
    )} KB`;
  }

  const megabytes =
    kilobytes / 1024;

  return `${megabytes.toFixed(
    1
  )} MB`;
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
      className="h-4 w-4 shrink-0"
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

function ImageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
      />
      <circle
        cx="8.5"
        cy="8.5"
        r="1.5"
      />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

function UploadIcon() { return <ActionIcon name="upload" />; }

function PackageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="m12 3 8 4-8 4-8-4 8-4Z" />
      <path d="m4 7 8 4 8-4" />
      <path d="M4 7v10l8 4 8-4V7" />
      <path d="M12 11v10" />
    </svg>
  );
}

function TrashIcon() { return <ActionIcon name="delete" />; }

function CheckIcon() {
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
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function PlusIcon() { return <ActionIcon name="add" />; }

function SpinnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4 animate-spin"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />

      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}