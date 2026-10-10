import "server-only";
import { authorize, assertSchool, checkDb, LmsError, uuid } from "./auth";
export async function ownedClass(id: string) {
  const auth = await authorize(["super_admin", "admin"]);
  const result = await auth.admin.from("groups").select("id,school_id").eq("id",uuid(id,"Class")).maybeSingle();
  checkDb(result.error);
  if (!result.data) throw new LmsError("Class not found.",404);
  assertSchool(auth.profile,result.data.school_id);
  return { ...auth, targetClass: result.data };
}
