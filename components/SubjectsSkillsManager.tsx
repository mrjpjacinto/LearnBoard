"use client";
import { hasGameSkill, hasGameSubject } from "@/lib/lms/game-skills";
import { Notification, showToast } from "./LmsToast";
import ActionIcon from "@/components/ActionIcon";
import { addButtonClass } from "@/lib/ui/buttons";


import {
  FormEvent,
  useMemo,
  useEffect,
  useRef,
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
  skill_ids?: string[];
  subject_ids?: string[];
};

type SubjectsSkillsManagerProps = {
  isSuperAdmin: boolean;
  subjects: SubjectRow[];
  skills: SkillRow[];
  games: GameRow[];
};

const inputClass =
  "h-12 w-full rounded-xl border border-[#D8DEEA] bg-white px-4 text-sm text-[#172033] outline-none transition placeholder:text-[#98A2B3] focus:border-[#818CF8] focus:ring-4 focus:ring-[#6366F1]/10 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#98A2B3]";

export default function SubjectsSkillsManager({
  isSuperAdmin,
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

  const [draftSubjectName, setDraftSubjectName] = useState<string | null>(null);

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
        <div className="mb-layout flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

          {isSuperAdmin && (<PrimaryAddButton
            onClick={() =>
              setShowSubjectModal(
                true
              )
            }
            className="self-start lg:self-auto"
          >
            Add Subject
          </PrimaryAddButton>)}
        </div>

        {subjects.length === 0 ? (
          <EmptyState canManage={isSuperAdmin}
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
          <div className="grid gap-layout xl:grid-cols-2">
            {filteredSubjects.map(
              (subject) => (
                <SubjectCard canManage={isSuperAdmin}
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

      {isSuperAdmin && showSubjectModal && (
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

      {isSuperAdmin && addSkillSubject && (
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

      {isSuperAdmin && manageSubject && (
        <div hidden={!!manageSkill || !!addSkillSubject}>
        <ManageSubjectModal canDelete={isSuperAdmin}
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
          onAddSkill={(name) => {
            setDraftSubjectName(name);
            setAddSkillSubject({...manageSubject, name});
          }}
          onManageSkill={(skill, name) => {
            setDraftSubjectName(name);
            setManageSkill(skill);
          }}
        />
        </div>
      )}

      {isSuperAdmin && manageSkill && (
        <ManageSkillModal canDelete={isSuperAdmin}
          skill={manageSkill}
          games={games}
          subjectNameUnsaved={!!manageSubject && draftSubjectName !== manageSubject.name}
          subject={
            manageSubject && draftSubjectName !== null
              ? {...manageSubject, name: draftSubjectName}
              : subjects.find(
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

function SubjectCard({ canManage, subject, skills, games, onManage, onAddSkill, onManageSkill }: {
  canManage: boolean; subject: SubjectRow; skills: SkillRow[]; games: GameRow[];
  onManage: () => void; onAddSkill: () => void; onManageSkill: (skill: SkillRow) => void;
}) {
  const [viewing, setViewing] = useState(false);
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (viewing) dialog.current?.showModal(); }, [viewing]);
  const shown = skills.filter(skill => `${skill.name} ${skill.description || ""}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <article className="overview-card !h-[420px] overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-sm transition hover:border-[#C7D2FE] hover:shadow-md">
      <div className="border-b border-[#E8ECF4] p-5">
        <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#6366F1]"><BookIcon /></span><div className="min-w-0 flex-1"><h2 title={subject.name} className="line-clamp-2 h-12 text-lg font-bold leading-6 text-[#172033]">{subject.name}</h2><p className="mt-1 line-clamp-1 text-sm text-[#667085]">{subject.description || "Organize related games and skills."}</p><p className="mt-2 text-xs text-[#667085]">{skills.length} skills · {games.filter(game => hasGameSubject(game, subject.id)).length} games</p></div>{canManage && <button type="button" onClick={onManage} className="shrink-0 rounded-lg bg-[#EEF0FF] px-3 py-2 text-xs font-semibold text-[#4F46E5]">Manage</button>}</div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-5">
        <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-[#344054]">Skills</h3>{canManage && <button type="button" onClick={onAddSkill} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#EEF0FF] px-3 text-xs font-semibold text-[#4F46E5]"><PlusIcon />Add Skill</button>}</div>
        <ul className="space-y-2">{skills.slice(0,3).map(skill => <li key={skill.id}><button type="button" onClick={() => {if(canManage) onManageSkill(skill);else {setQuery(skill.name);setViewing(true);}}} className="flex h-11 w-full items-center gap-2 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] px-3 text-left hover:bg-[#EEF0FF]"><span className={"h-2 w-2 shrink-0 rounded-full " + (skill.is_active ? "bg-[#818CF8]" : "bg-[#CBD5E1]")} /><span className="min-w-0 flex-1 truncate text-sm font-medium text-[#344054]">{skill.name}</span><span className="shrink-0 text-xs text-[#667085]">{games.filter(game => hasGameSkill(game,skill.id)).length} games</span><ChevronRightIcon /></button></li>)}</ul>
        {!skills.length && <p className="rounded-xl border border-dashed border-[#D8DEEA] py-8 text-center text-sm text-[#667085]">No skills yet</p>}
        <button type="button" onClick={() => {setQuery(""); setViewing(true);}} className="mt-auto inline-flex min-h-10 items-center justify-center gap-2 pt-3 text-sm font-semibold text-[#4F46E5]">View all {skills.length} skills <ChevronRightIcon /></button>
      </div>
    </article>    <dialog ref={dialog} onClose={() => setViewing(false)} aria-label={`Skills in ${subject.name}`} className="m-auto max-h-[85dvh] w-[min(720px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-[#E3E8F2] bg-white p-5 text-[#172033] shadow-xl">
      <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="break-words text-xl font-bold">{subject.name}</h2><p className="mt-1 text-sm text-[#667085]">{skills.length} skills</p></div><button type="button" aria-label="Close skill list" className="shrink-0 rounded-lg p-2 hover:bg-[#F8FAFC]" onClick={() => dialog.current?.close()}><CloseIcon /></button></div>
      {subject.description && <p className="mt-4 whitespace-pre-wrap break-words text-sm text-[#667085]">{subject.description}</p>}
      <input aria-label="Search this subject's skills" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search skills..." className={inputClass + " my-4"} />
      <ul className="divide-y divide-[#E8ECF4]">{shown.map(skill => <li key={skill.id} className="py-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="break-words font-semibold">{skill.name}</h3><p className="mt-1 text-xs text-[#667085]">{skill.is_active ? "Active" : "Inactive"} · {games.filter(game => hasGameSkill(game, skill.id)).length} games</p></div>{canManage && <button type="button" onClick={() => {dialog.current?.close(); onManageSkill(skill);}} className="shrink-0 rounded-lg bg-[#EEF0FF] px-3 py-2 text-sm font-semibold text-[#4F46E5]">Manage</button>}</div>{skill.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[#667085]">{skill.description}</p>}</li>)}</ul>
      {!shown.length && <p className="py-8 text-center text-sm text-[#667085]">{skills.length ? "No matching skills." : "No skills added yet."}</p>}
    </dialog>
  </>;
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

      showToast({ type: "success", message: "Subject created." });
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
        className="stack-layout"
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

      showToast({ type: "success", message: "Skill created." });
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
        className="stack-layout"
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
  canDelete,
  subject,
  skills,
  games,
  onClose,
  onSaved,
  onAddSkill,
  onManageSkill,
}: {
  canDelete: boolean;
  subject: SubjectRow;
  skills: SkillRow[];
  games: GameRow[];
  onClose: () => void;
  onSaved: () => void;
  onAddSkill: (name: string) => void;
  onManageSkill: (
    skill: SkillRow, name: string
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
              isActive: true,
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

      showToast({ type: "success", message: "Subject updated." });
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
        hasGameSubject(game,subject.id)
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
        className="stack-layout"
      >
        <div className="grid gap-layout md:grid-cols-2">
          <TextField
            label="Subject Name"
            value={name}
            onChange={setName}
            placeholder="Subject name"
            maxLength={100}
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
                Skills in {name.trim() || subject.name}
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
              onClick={() => onAddSkill(name.trim() || subject.name)}
              disabled={saving}
              className={addButtonClass}
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
                        hasGameSkill(game,skill.id)
                    ).length;

                  return (
                    <button
                      key={
                        skill.id
                      }
                      type="button"
                      onClick={() =>
                        onManageSkill(
                          skill, name.trim() || subject.name
                        )
                      }
                      disabled={
                        saving
                      }
                      className="flex w-full items-center gap-3 rounded-lg border border-[#E8ECF4] bg-[#EEF0FF] px-4 py-3 text-left transition hover:border-[#C7CCFF] disabled:opacity-50"
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



        {error && (
          <ErrorMessage>
            {error}
          </ErrorMessage>
        )}

        <ModalActions
          leading={canDelete ? <DeleteClassification affectedGames={subjectGameCount} kind="subjects" id={subject.id} name={subject.name} disabled={saving} onDeleted={onSaved} /> : undefined}
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
  canDelete,
  games,
  skill,
  subject,
  subjectNameUnsaved = false,
  onClose,
  onSaved,
}: {
  canDelete: boolean;
  games: GameRow[];
  skill: SkillRow;
  subject: SubjectRow | null;
  subjectNameUnsaved?: boolean;
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
              isActive: true,
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

      showToast({ type: "success", message: "Skill updated." });
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
      description="Edit this skill and its description."
      onClose={onClose}
      disabled={saving}
    >
      {subject && (
        <SubjectContext
          subject={subject}
        />
      )}

      {subjectNameUnsaved && <p className="mb-4 text-sm text-amber-700">This subject name is unsaved. Return to Manage Subject and save its changes to make the name permanent.</p>}
      <form
        onSubmit={handleSubmit}
        className="stack-layout"
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





        {error && (
          <ErrorMessage>
            {error}
          </ErrorMessage>
        )}

        <ModalActions
          leading={canDelete ? <DeleteClassification affectedGames={games.filter(game => hasGameSkill(game,skill.id)).length} kind="skills" id={skill.id} name={skill.name} disabled={saving} onDeleted={onSaved} /> : undefined}
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
    <div className="mb-layout rounded-xl border border-[#E3E8F2] bg-[#F8FAFC] px-4 py-3">
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
  leading,
  onCancel,
  saving,
  submitLabel,
  showPlus = true,
}: {
  leading?: React.ReactNode;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
  showPlus?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-t border-[#E8ECF4] pt-5">
      {leading && <div className="min-w-0 sm:flex-1">{leading}</div>}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="inline-flex h-11 items-center justify-center rounded-xl border border-[#D8DEEA] bg-white px-5 text-sm font-semibold text-[#344054] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={saving}
        className={addButtonClass}
      >
        {saving ? (
          <>
            <Spinner />
            Saving...
          </>
        ) : (
          <>
            <ActionIcon name={showPlus ? "add" : "save"} />
            {submitLabel}
          </>
        )}
      </button>
      </div>
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



function ErrorMessage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Notification type="error" message={String(children)} />
  );
}

function EmptyState({
  canManage,
  onAddSubject,
}: {
  canManage: boolean;
  onAddSubject: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#E3E8F2] bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#6366F1]">
        <BookIcon />
      </div>

      <h2 className="mt-layout text-lg font-bold text-[#172033]">
        Create your first
        subject
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085]">
        Start with a subject
        such as Math or English,
        then add skills to
        organize its games.
      </p>

      <div className="mt-layout flex justify-center">
        {canManage && (<PrimaryAddButton
          onClick={
            onAddSubject
          }
        >
          Add Subject
        </PrimaryAddButton>)}
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

function PlusIcon() { return <ActionIcon name="add" />; }

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

function ChevronRightIcon() { return <ActionIcon name="next" />; }

function CloseIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>; }

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
function DeleteClassification({kind,id,name,affectedGames,disabled,onDeleted}:{kind:"subjects"|"skills";id:string;name:string;affectedGames:number;disabled:boolean;onDeleted:()=>void}) {
 const [confirming,setConfirming]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[count,setCount]=useState(affectedGames);
 const label=kind==="subjects"?"Subject":"Skill";
 async function remove(confirmed=false){if(busy)return;setBusy(true);setError("");try{const response=await fetch("/api/admin/"+kind+"/"+id+(confirmed?"?confirm=true":""),{method:"DELETE"});const result=await response.json();if(result.requires_confirmation){setCount(result.affected_games);setConfirming(true);return;}if(!response.ok)throw Error(result.error||"Unable to delete.");showToast({type:"success",message:label+" deleted."});onDeleted();}catch(e){setError(getErrorMessage(e,"Unable to delete."));}finally{setBusy(false);}}
 return <div className="space-y-3">
 <button type="button" disabled={disabled||busy} onClick={()=>{if(affectedGames>0){setCount(affectedGames);setConfirming(true);}else void remove();}} className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"><ActionIcon name="delete" />{busy?"Deleting...":"Delete "+label}</button>
 {!confirming&&error&&<ErrorMessage>{error}</ErrorMessage>}
 {confirming&&<div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby={"delete-"+id} onMouseDown={event=>{if(!busy&&event.target===event.currentTarget)setConfirming(false);}}>
 <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-xl"><div className="p-6"><div className="flex items-start gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><ActionIcon name="delete" /></div><div className="flex-1"><h3 id={"delete-"+id} className="text-lg font-bold text-[#172033]">Delete this {label.toLowerCase()}?</h3><p className="mt-2 text-sm text-[#667085]">Permanently delete <strong>{name}</strong>?</p></div><button type="button" disabled={busy} aria-label="Close deletion confirmation" onClick={()=>setConfirming(false)} className="rounded-lg p-2 text-[#667085] hover:bg-[#F8FAFC]"><CloseIcon /></button></div><p className="mt-5 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] p-4 text-sm leading-6 text-[#667085]">{count} game{count===1?"":"s"} will lose the removed skill assignments. Games with other skills stay assigned; those with no skills left appear first in Games Management for reassignment. {kind==="subjects"?"This subject and its skills will be removed. ":"This skill will be removed. "}Game files, Learning Paths, student attempts, scores, and history will be preserved.</p>{error&&<div className="mt-3"><ErrorMessage>{error}</ErrorMessage></div>}</div><div className="flex justify-end gap-3 border-t border-[#E8ECF4] bg-[#FAFBFD] px-6 py-4"><button type="button" disabled={busy} onClick={()=>setConfirming(false)} className="h-10 rounded-xl border border-[#D8DEEA] bg-white px-4 text-sm font-semibold text-[#344054]">Cancel</button><button type="button" disabled={busy} onClick={()=>void remove(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-50"><ActionIcon name="delete" />{busy?"Deleting...":"Delete "+label}</button></div></div></div>}
 </div>;
}
