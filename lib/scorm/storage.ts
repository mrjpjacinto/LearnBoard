import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
export async function removeScormPrefix(admin: ReturnType<typeof createAdminClient>, prefix: string) {
  if (!prefix || prefix.includes("..") || prefix.startsWith("/")) throw new Error("Invalid package cleanup prefix.");
  const result = await admin.storage.from("scorm-packages").list(prefix,{limit:1000,offset:0});
  if (result.error) throw result.error;
  if (!result.data?.length) return;
  const files:string[]=[];
  for (const entry of result.data) {const path=`${prefix}/${entry.name}`;if(entry.id)files.push(path);else await removeScormPrefix(admin,path);}
  if(files.length){const {error}=await admin.storage.from("scorm-packages").remove(files);if(error)throw error;}
  if(result.data.length===1000)await removeScormPrefix(admin,prefix);
}
