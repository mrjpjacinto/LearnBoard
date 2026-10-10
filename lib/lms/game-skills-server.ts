import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LmsError, checkDb } from "./auth";
import type { ClassifiedGame } from "./game-skills";
function missingTable(error: {code?:string} | null) { return error?.code === "42P01" || error?.code === "PGRST205"; }
export async function loadGameClassifications<T extends ClassifiedGame & {id:string}>(admin: SupabaseClient, games: T[]): Promise<(T & {skill_ids:string[];subject_ids:string[]})[]> {
 if (!games.length) return [];
 const data: {game_id:string;skill_id:string;skills:{subject_id:string} | {subject_id:string}[]}[] = [];
 for(let offset=0;offset<games.length;offset+=200) {
  const ids=games.slice(offset,offset+200).map(game=>game.id);
  for(let start=0;;start+=1000) {
   const result=await admin.from("game_skills").select("game_id,skill_id,skills(subject_id)").in("game_id",ids).order("game_id").order("skill_id").range(start,start+999);
   if(missingTable(result.error))return games.map(game=>({...game,skill_ids:game.skill_id?[game.skill_id]:[],subject_ids:game.skill_id&&game.subject_id?[game.subject_id]:[]}));
   checkDb(result.error);data.push(...(result.data||[]));if((result.data||[]).length<1000)break;
  }
 }
 return games.map(game=>{const links=data.filter(link=>link.game_id===game.id);return {...game,skill_ids:links.map(link=>link.skill_id),subject_ids:[...new Set(links.flatMap(link=>{const skill=Array.isArray(link.skills)?link.skills[0]:link.skills;return skill?.subject_id?[skill.subject_id]:[];}))]};});
}
export async function validateGameSkills(admin: SupabaseClient, ids:string[]) {
 const result=await admin.from("skills").select("id,subject_id,is_active").in("id",ids);
 checkDb(result.error);
 if(result.data?.length!==ids.length||result.data.some(skill=>!skill.is_active||!skill.subject_id))throw new LmsError("Choose available skills.");
 const subjects=await admin.from("subjects").select("id,is_active").in("id",[...new Set(result.data.map(skill=>skill.subject_id))]);checkDb(subjects.error);
 if(subjects.data?.some(subject=>!subject.is_active)||subjects.data?.length!==new Set(result.data.map(skill=>skill.subject_id)).size)throw new LmsError("Choose skills in available subjects.");
 const capability=await admin.from("game_skills").select("game_id").limit(0);
 if(!missingTable(capability.error))checkDb(capability.error);
 if(missingTable(capability.error)&&ids.length>1)throw new LmsError("The multiple-skills database update is required before saving these skills.",503);
 return {primary:result.data.find(skill=>skill.id===ids[0])!,enabled:!missingTable(capability.error)};
}
export async function saveGameSkills(admin:SupabaseClient, id:string, ids:string[], values:Record<string,unknown>, enabled:boolean) {
 if(enabled)return admin.rpc("lumentrail_save_game_skills",{p_game:id,p_skills:ids,p_values:values}).single();
 return admin.from("games").update(values).eq("id",id).select("*").maybeSingle();
}

export async function classificationImpact(admin:SupabaseClient, kind:"subjects"|"skills", id:string) {
 const data: (ClassifiedGame & {id:string})[]=[];
 for(let start=0;;start+=1000){const result=await admin.from("games").select("id,skill_id,subject_id").order("id").range(start,start+999);checkDb(result.error);data.push(...(result.data||[]));if((result.data||[]).length<1000)break;}
 const games=await loadGameClassifications(admin,data);
 let removed=[id];
 if(kind==="subjects") {const result=await admin.from("skills").select("id").eq("subject_id",id);checkDb(result.error);removed=(result.data||[]).map(skill=>skill.id);}
 const affected=games.filter(game=>game.skill_ids.some(skill=>removed.includes(skill)));
 return {count:affected.length,unassigned:affected.filter(game=>game.skill_ids.every(skill=>removed.includes(skill))).length};
}
