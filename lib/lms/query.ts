import "server-only";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { checkDb, LmsError } from "./auth";
export async function readAll<T>(query: { range(from: number, to: number): PromiseLike<PostgrestSingleResponse<T[]>> }): Promise<T[]> {
  const rows: T[] = [];
  for (let from=0;from<100000;from+=1000) { const result=await query.range(from,from+999); checkDb(result.error); const page=result.data || []; rows.push(...page); if(page.length<1000)return rows; }
  throw new LmsError("This report is too large. Narrow the school, class, or student filter.",400);
}
