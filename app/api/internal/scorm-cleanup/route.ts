import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {runScormCleanup} from "@/lib/scorm/cleanup-worker";
import {apiError} from "@/lib/lms/auth";
export const runtime="nodejs";
export const maxDuration=60;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 const expected=Buffer.from("Bearer "+(secret||"")),actual=Buffer.from(request.headers.get("authorization")||"");
 if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return NextResponse.json({error:"Unauthorized"},{status:401});
 try{return NextResponse.json(await runScormCleanup(createAdminClient()),{headers:{"Cache-Control":"no-store"}});}catch(error){return apiError(error);}
}
