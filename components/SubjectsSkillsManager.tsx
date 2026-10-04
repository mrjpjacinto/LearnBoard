"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import PrimaryAddButton from "@/components/PrimaryAddButton";

type SubjectRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

type SkillRow = {
  id: string;
  subject_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

type GameRow = {
  id: string;
  subject_id: string | null;
  skill_id: string | null;
};

type SubjectsSkillsManagerProps = {
  subjects: SubjectRow[];
  skills: SkillRow[];
  games: GameRow[];
};

const inputClass =
  "h-12 w-full rounded-xl border border-[#D8DEEA] bg-white px-4 text-sm text-[#172033] outline-none transition placeholder:text-[#98A2B3] focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#98A2B3]";

export default function SubjectsSkillsManager({
  subjects,
  skills,
  games,
}: SubjectsSkillsManagerProps) {
  const router = useRouter();

  const [search, setSearch] =
    useState("");

  const [
    showSubjectModal,
    setShowSubjectModal,
  ] = useState(false);

  const [
    addSkillSubject,
    setAddSkillSubject,
  ] = useState<SubjectRow | null>(
    null
  );

  const [
    manageSubject,
    setManageSubject,
  ] = useState<SubjectRow | null>(
    null
  );

  const [
    manageSkill,
    setManageSkill,
  ] = useState<SkillRow | null>(
    null
  );

  const filteredSubjects =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) {
        return subjects;
      }

      return subjects.filter(
        (subject) => {
          const subjectSkills =
            skills.filter(
              (skill) =>
                skill.subject_id ===
                subject.id
            );

          return (
            subject.name
              .toLowerCase()
              .includes(query) ||
            (
              subject.description ||
              ""
            )
              .toLowerCase()
              .includes(query) ||
            subjectSkills.some(
              (skill) =>
                skill.name
                  .toLowerCase()
                  .includes(query)
            )
          );
        }
      );
    }, [
      search,
      subjects,
      skills,
    ]);

  function refresh() {
    router.refresh();
  }

  return (
    <>
      <section>
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search subjects or skills..."
              className="h-12 w-full rounded-xl border border-[#D8DEEA] bg-white pl-11 pr-4 text-sm text-[#172033] outline-none transition placeholder:text-[#98A2B3] focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10"
            />
          </div>

          <PrimaryAddButton
            onClick={() =>
              setShowSubjectModal(
                true
              )
            }
            className="self-start lg:self-auto"
          >
            Add Subject
          </PrimaryAddButton>
        </div>

        {subjects.length === 0 ? (
          <EmptyState
            onAddSubject={() =>
              setShowSubjectModal(
                true
              )
            }
          />
        ) : filteredSubjects.length ===
          0 ? (
          <div className="rounded-2xl border border-[#E3E8F2] bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#6366F1]">
              <SearchIcon />
            </div>

            <h2 className="mt-4 text-lg font-bold text-[#172033]">
              No matches found
            </h2>

            <p className="mt-2 text-sm text-[#667085]">
              Try a different subject
              or skill name.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {filteredSubjects.map(
              (subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  skills={skills.filter(
                    (skill) =>
                      skill.subject_id ===
                      subject.id
                  )}
                  games={games}
                  onManage={() =>
                    setManageSubject(
                      subject
                    )
                  }
                  onAddSkill={() =>
                    setAddSkillSubject(
                      subject
                    )
                  }
                  onManageSkill={(
                    skill
                  ) =>
                    setManageSkill(
                      skill
                    )
                  }
                />
              )
            )}
          </div>
        )}
      </section>

      {showSubjectModal && (
        <AddSubjectModal
          onClose={() =>
            setShowSubjectModal(
              false
            )
          }
          onSaved={() => {
            setShowSubjectModal(
              false
            );
            refresh();
          }}
        />
      )}

      {addSkillSubject && (
        <AddSkillModal
          subject={
            addSkillSubject
          }
          onClose={() =>
            setAddSkillSubject(
              null
            )
          }
          onSaved={() => {
            setAddSkillSubject(
              null
            );
            refresh();
          }}
        />
      )}

      {manageSubject && (
        <ManageSubjectModal
          subject={
            manageSubject
          }
          skills={skills.filter(
            (skill) =>
              skill.subject_id ===
              manageSubject.id
          )}
          games={games}
          onClose={() =>
            setManageSubject(
              null
            )
          }
          onSaved={() => {
            setManageSubject(
              null
            );
            refresh();
          }}
          onAddSkill={() => {
            const subject =
              manageSubject;

            setManageSubject(
              null
            );

            setAddSkillSubject(
              subject
            );
          }}
          onManageSkill={(
            skill
          ) => {
            setManageSubject(
              null
            );

            setManageSkill(
              skill
            );
          }}
        />
      )}

      {manageSkill && (
        <ManageSkillModal
          skill={manageSkill}
          subject={
            subjects.find(
              (subject) =>
                subject.id ===
                manageSkill.subject_id
            ) || null
          }
          onClose={() =>
            setManageSkill(null)
          }
          onSaved={() => {
            setManageSkill(null);
            refresh();
          }}
        />
      )}
    </>
  );
}

function SubjectCard({
  subject,
  skills,
  games,
  onManage,
  onAddSkill,
  onManageSkill,
}: {
  subject: SubjectRow;
  skills: SkillRow[];
  games: GameRow[];
  onManage: () => void;
  onAddSkill: () => void;
  onManageSkill: (
    skill: SkillRow
  ) => void;
}) {
  const subjectGames =
    games.filter(
      (game) =>
        game.subject_id ===
        subject.id
    );

  return (
    <article className="overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-sm transition hover:border-[#D5DBE8] hover:shadow-md">
      <div className="border-b border-[#E8ECF4] px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#6366F1]">
            <BookIcon />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-[#172033]">
                {subject.name}
              </h2>

              <StatusBadge
                active={
                  subject.is_active
                }
              />
            </div>

            <p className="mt-1 min-h-5 text-sm text-[#667085]">
              {subject.description ||
                "Organize related games and skills."}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-[#98A2B3]">
              <span>
                {skills.length}{" "}
                {skills.length === 1
                  ? "skill"
                  : "skills"}
              </span>

              <span className="h-1 w-1 rounded-full bg-[#CBD5E1]" />

              <span>
                {subjectGames.length}{" "}
                {subjectGames.length ===
                1
                  ? "game"
                  : "games"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onManage}
            className="shrink-0 rounded-lg border border-[#D8DEEA] bg-white px-3 py-2 text-xs font-semibold text-[#475467] transition hover:border-[#C8D0DF] hover:bg-[#F8FAFC]"
          >
            Manage
          </button>
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[#344054]">
              Skills
            </p>

            <p className="mt-0.5 text-xs text-[#98A2B3]">
              Game groupings inside{" "}
              {subject.name}
            </p>
          </div>

          <button
            type="button"
            onClick={onAddSkill}
            disabled={
              !subject.is_active
            }
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#D8DEEA] bg-white px-3 text-xs font-semibold text-[#4F46E5] transition hover:border-[#C7CCFF] hover:bg-[#F8F8FF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon />
            Add Skill
          </button>
        </div>

        {skills.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D8DEEA] bg-[#FAFBFD] px-5 py-7 text-center">
            <p className="text-sm font-semibold text-[#667085]">
              No skills yet
            </p>

            <p className="mt-1 text-xs text-[#98A2B3]">
              Add the first skill
              for this subject.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {skills.map(
              (skill) => {
                const gameCount =
                  games.filter(
                    (game) =>
                      game.skill_id ===
                      skill.id
                  ).length;

                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() =>
                      onManageSkill(
                        skill
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-xl border border-[#EDF0F5] bg-[#FAFBFD] px-4 py-3 text-left transition hover:border-[#D8DEEA] hover:bg-white"
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        skill.is_active
                          ? "bg-[#818CF8]"
                          : "bg-[#CBD5E1]"
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-semibold ${
                          skill.is_active
                            ? "text-[#344054]"
                            : "text-[#98A2B3]"
                        }`}
                      >
                        {skill.name}
                      </p>

                      {skill.description && (
                        <p className="mt-0.5 truncate text-xs text-[#98A2B3]">
                          {
                            skill.description
                          }
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-[#667085] shadow-sm ring-1 ring-[#E8ECF4]">
                      {gameCount}{" "}
                      {gameCount === 1
                        ? "game"
                        : "games"}
                    </div>

                    <ChevronRightIcon />
                  </button>
                );
              }
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function AddSubjectModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");

    if (!name.trim()) {
      setError(
        "Subject name is required."
      );
      return;
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          "/api/admin/subjects",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              name: name.trim(),
              description:
                description.trim(),
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to create the subject."
        );
      }

      onSaved();
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to create the subject."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="Add Subject"
      description="Create a main category for organizing your games."
      onClose={onClose}
      disabled={saving}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <TextField
          label="Subject Name"
          value={name}
          onChange={setName}
          placeholder="Example: Math"
          maxLength={100}
          disabled={saving}
          autoFocus
        />

        <DescriptionField
          value={description}
          onChange={
            setDescription
          }
          disabled={saving}
        />

        {error && (
          <ErrorMessage>
            {error}
          </ErrorMessage>
        )}

        <ModalActions
          onCancel={onClose}
          saving={saving}
          submitLabel="Add Subject"
        />
      </form>
    </ModalShell>
  );
}

function AddSkillModal({
  subject,
  onClose,
  onSaved,
}: {
  subject: SubjectRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");

    if (!name.trim()) {
      setError(
        "Skill name is required."
      );
      return;
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          "/api/admin/skills",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              subjectId:
                subject.id,
              name: name.trim(),
              description:
                description.trim(),
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to create the skill."
        );
      }

      onSaved();
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to create the skill."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="Add Skill"
      description={`Add a skill underneath ${subject.name}.`}
      onClose={onClose}
      disabled={saving}
    >
      <SubjectContext
        subject={subject}
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <TextField
          label="Skill Name"
          value={name}
          onChange={setName}
          placeholder="Example: Multiplication"
          maxLength={100}
          disabled={saving}
          autoFocus
        />

        <DescriptionField
          value={description}
          onChange={
            setDescription
          }
          disabled={saving}
        />

        {error && (
          <ErrorMessage>
            {error}
          </ErrorMessage>
        )}

        <ModalActions
          onCancel={onClose}
          saving={saving}
          submitLabel="Add Skill"
        />
      </form>
    </ModalShell>
  );
}

function ManageSubjectModal({
  subject,
  skills,
  games,
  onClose,
  onSaved,
  onAddSkill,
  onManageSkill,
}: {
  subject: SubjectRow;
  skills: SkillRow[];
  games: GameRow[];
  onClose: () => void;
  onSaved: () => void;
  onAddSkill: () => void;
  onManageSkill: (
    skill: SkillRow
  ) => void;
}) {
  const [name, setName] =
    useState(subject.name);

  const [
    description,
    setDescription,
  ] = useState(
    subject.description || ""
  );

  const [
    isActive,
    setIsActive,
  ] = useState(
    subject.is_active
  );

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");

    if (!name.trim()) {
      setError(
        "Subject name is required."
      );
      return;
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          `/api/admin/subjects/${subject.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              name: name.trim(),
              description:
                description.trim(),
              isActive,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to update the subject."
        );
      }

      onSaved();
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to update the subject."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  const subjectGameCount =
    games.filter(
      (game) =>
        game.subject_id ===
        subject.id
    ).length;

  return (
    <ModalShell
      title="Manage Subject"
      description="Edit this subject and manage its skills."
      onClose={onClose}
      disabled={saving}
      wide
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label="Subject Name"
            value={name}
            onChange={setName}
            placeholder="Subject name"
            maxLength={100}
            disabled={saving}
          />

          <StatusControl
            label="Subject Status"
            active={isActive}
            onChange={
              setIsActive
            }
            disabled={saving}
          />
        </div>

        <DescriptionField
          value={description}
          onChange={
            setDescription
          }
          disabled={saving}
        />

        <div className="rounded-xl border border-[#E3E8F2] bg-[#F8FAFC] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#344054]">
                Skills
              </p>

              <p className="mt-1 text-xs text-[#98A2B3]">
                {skills.length}{" "}
                {skills.length === 1
                  ? "skill"
                  : "skills"}
                {" · "}
                {
                  subjectGameCount
                }{" "}
                {subjectGameCount ===
                1
                  ? "game"
                  : "games"}
              </p>
            </div>

            <button
              type="button"
              onClick={onAddSkill}
              disabled={
                saving ||
                !isActive
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D8DEEA] bg-white px-3 text-xs font-semibold text-[#4F46E5] transition hover:bg-[#F8F8FF] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusIcon />
              Add Skill
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {skills.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#D8DEEA] bg-white px-4 py-5 text-center text-sm text-[#98A2B3]">
                No skills have been
                added yet.
              </p>
            ) : (
              skills.map(
                (skill) => {
                  const count =
                    games.filter(
                      (game) =>
                        game.skill_id ===
                        skill.id
                    ).length;

                  return (
                    <button
                      key={
                        skill.id
                      }
                      type="button"
                      onClick={() =>
                        onManageSkill(
                          skill
                        )
                      }
                      disabled={
                        saving
                      }
                      className="flex w-full items-center gap-3 rounded-lg border border-[#E8ECF4] bg-white px-4 py-3 text-left transition hover:border-[#C7CCFF] disabled:opacity-50"
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          skill.is_active
                            ? "bg-[#818CF8]"
                            : "bg-[#CBD5E1]"
                        }`}
                      />

                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#344054]">
                        {skill.name}
                      </span>

                      <span className="text-xs text-[#98A2B3]">
                        {count}{" "}
                        {count === 1
                          ? "game"
                          : "games"}
                      </span>

                      <ChevronRightIcon />
                    </button>
                  );
                }
              )
            )}
          </div>
        </div>

        {!isActive &&
          subject.is_active && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800">
              Deactivating this
              subject will also
              deactivate its current
              skills. Existing games
              will not be deleted.
            </div>
          )}

        {error && (
          <ErrorMessage>
            {error}
          </ErrorMessage>
        )}

        <ModalActions
          onCancel={onClose}
          saving={saving}
          submitLabel="Save Changes"
          showPlus={false}
        />
      </form>
    </ModalShell>
  );
}

function ManageSkillModal({
  skill,
  subject,
  onClose,
  onSaved,
}: {
  skill: SkillRow;
  subject: SubjectRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] =
    useState(skill.name);

  const [
    description,
    setDescription,
  ] = useState(
    skill.description || ""
  );

  const [
    isActive,
    setIsActive,
  ] = useState(
    skill.is_active
  );

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");

    if (!name.trim()) {
      setError(
        "Skill name is required."
      );
      return;
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          `/api/admin/skills/${skill.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              name: name.trim(),
              description:
                description.trim(),
              isActive,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to update the skill."
        );
      }

      onSaved();
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to update the skill."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="Manage Skill"
      description="Edit the skill details and availability."
      onClose={onClose}
      disabled={saving}
    >
      {subject && (
        <SubjectContext
          subject={subject}
        />
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <TextField
          label="Skill Name"
          value={name}
          onChange={setName}
          placeholder="Skill name"
          maxLength={100}
          disabled={saving}
          autoFocus
        />

        <DescriptionField
          value={description}
          onChange={
            setDescription
          }
          disabled={saving}
        />

        <StatusControl
          label="Skill Status"
          active={isActive}
          onChange={
            setIsActive
          }
          disabled={
            saving ||
            !subject?.is_active
          }
        />

        {subject &&
          !subject.is_active && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This subject is
              inactive. Activate the
              subject before
              activating this skill.
            </div>
          )}

        {error && (
          <ErrorMessage>
            {error}
          </ErrorMessage>
        )}

        <ModalActions
          onCancel={onClose}
          saving={saving}
          submitLabel="Save Changes"
          showPlus={false}
        />
      </form>
    </ModalShell>
  );
}

function SubjectContext({
  subject,
}: {
  subject: SubjectRow;
}) {
  return (
    <div className="mb-5 rounded-xl border border-[#E3E8F2] bg-[#F8FAFC] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
        Subject
      </p>

      <p className="mt-1 text-sm font-bold text-[#344054]">
        {subject.name}
      </p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  disabled,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder: string;
  maxLength: number;
  disabled: boolean;
  autoFocus?: boolean;
}) {
  return (
    <Field>
      <FieldLabel>
        {label}
      </FieldLabel>

      <input
        autoFocus={autoFocus}
        type="text"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        maxLength={
          maxLength
        }
        disabled={disabled}
        className={inputClass}
      />
    </Field>
  );
}

function DescriptionField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (
    value: string
  ) => void;
  disabled: boolean;
}) {
  return (
    <Field>
      <FieldLabel optional>
        Description
      </FieldLabel>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        maxLength={500}
        rows={4}
        placeholder="Short description..."
        disabled={disabled}
        className={`${inputClass} h-auto resize-none py-3`}
      />
    </Field>
  );
}

function StatusControl({
  label,
  active,
  onChange,
  disabled,
}: {
  label: string;
  active: boolean;
  onChange: (
    value: boolean
  ) => void;
  disabled: boolean;
}) {
  return (
    <Field>
      <FieldLabel>
        {label}
      </FieldLabel>

      <button
        type="button"
        onClick={() =>
          onChange(!active)
        }
        disabled={disabled}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-[#D8DEEA] bg-white px-4 text-left transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div>
          <p className="text-sm font-semibold text-[#344054]">
            {active
              ? "Active"
              : "Inactive"}
          </p>

          <p className="text-xs text-[#98A2B3]">
            {active
              ? "Available for use"
              : "Not available for new games"}
          </p>
        </div>

        <span
          className={`relative h-6 w-11 rounded-full transition ${
            active
              ? "bg-[#6366F1]"
              : "bg-[#CBD5E1]"
          }`}
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
              active
                ? "left-6"
                : "left-1"
            }`}
          />
        </span>
      </button>
    </Field>
  );
}

function ModalShell({
  title,
  description,
  onClose,
  disabled,
  children,
  wide = false,
}: {
  title: string;
  description: string;
  onClose: () => void;
  disabled: boolean;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0F172A]/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !disabled
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`my-auto w-full overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-2xl ${
          wide
            ? "max-w-2xl"
            : "max-w-lg"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E8ECF4] px-6 py-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#172033]">
              {title}
            </h2>

            <p className="mt-1 text-sm leading-5 text-[#667085]">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition hover:bg-[#F4F7FB] hover:text-[#344054] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  saving,
  submitLabel,
  showPlus = true,
}: {
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
  showPlus?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-[#E8ECF4] pt-5">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="h-11 rounded-xl border border-[#D8DEEA] bg-white px-5 text-sm font-semibold text-[#475467] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? (
          <>
            <Spinner />
            Saving...
          </>
        ) : (
          <>
            {showPlus && (
              <PlusIcon />
            )}
            {submitLabel}
          </>
        )}
      </button>
    </div>
  );
}

function Field({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {children}
    </div>
  );
}

function FieldLabel({
  children,
  optional = false,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="flex items-center justify-between text-sm font-semibold text-[#344054]">
      <span>{children}</span>

      {optional && (
        <span className="text-xs font-normal text-[#98A2B3]">
          Optional
        </span>
      )}
    </label>
  );
}

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {active
        ? "Active"
        : "Inactive"}
    </span>
  );
}

function ErrorMessage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {children}
    </div>
  );
}

function EmptyState({
  onAddSubject,
}: {
  onAddSubject: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#E3E8F2] bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#6366F1]">
        <BookIcon />
      </div>

      <h2 className="mt-5 text-lg font-bold text-[#172033]">
        Create your first
        subject
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085]">
        Start with a subject
        such as Math or English,
        then add skills to
        organize its games.
      </p>

      <div className="mt-6 flex justify-center">
        <PrimaryAddButton
          onClick={
            onAddSubject
          }
        >
          Add Subject
        </PrimaryAddButton>
      </div>
    </div>
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string
) {
  return error instanceof Error
    ? error.message
    : fallback;
}

function BookIcon() {
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
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function SearchIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
      />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0 text-[#98A2B3]"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 animate-spin"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />

      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}