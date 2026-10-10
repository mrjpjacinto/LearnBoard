export type ClassifiedGame = { skill_id: string | null; subject_id?: string | null; skill_ids?: string[]; subject_ids?: string[] };
export function gameSkillIds(game: ClassifiedGame): string[] { return game.skill_ids ?? (game.skill_id ? [game.skill_id] : []); }
export function gameSubjectIds(game: ClassifiedGame): string[] { return game.subject_ids ?? (game.subject_id ? [game.subject_id] : []); }
export function hasGameSkill(game: ClassifiedGame, id: string) { return gameSkillIds(game).includes(id); }
export function hasGameSubject(game: ClassifiedGame, id: string) { return gameSubjectIds(game).includes(id); }
export function parseSkillIds(form: FormData, legacyKey: string): string[] {
 const raw = form.getAll("skill_ids");
 const values = raw.length ? raw : [form.get(legacyKey)];
 if (!values.length || values.some(value => typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))) throw new Error("Choose at least one valid skill.");
 const ids = [...new Set(values.map(value => String(value).toLowerCase()))];
 if (ids.length > 50) throw new Error("Choose no more than 50 skills.");
 return ids;
}
