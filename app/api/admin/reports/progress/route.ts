import { NextResponse } from "next/server";
import { authorize, uuid, assertSchool, apiError, checkDb, LmsError } from "@/lib/lms/auth";
import { readAll } from "@/lib/lms/query";
export async function GET(request: Request) {
  try {
    const {admin,profile}=await authorize(["super_admin","admin"]);const params=new URL(request.url).searchParams;const boardId=uuid(params.get("path"),"Path");
    const board=await admin.from("learning_boards").select("school_id").eq("id",boardId).maybeSingle();checkDb(board.error);if(!board.data)throw new LmsError("Path not found.",404);assertSchool(profile,board.data.school_id);
    if(params.get("school")&&params.get("school")!==board.data.school_id)return NextResponse.json({rows:[]});
    let rosterQuery=admin.from("profiles").select("id,full_name,email").eq("school_id",board.data.school_id).eq("role","student").order("id");
    if(params.get("student"))rosterQuery=rosterQuery.eq("id",uuid(params.get("student")));
    const roster=await readAll(rosterQuery);
    const [assignments,classes,steps,groups]=await Promise.all([
      readAll(admin.from("assignments").select("id,student_id,group_assignment_id,status").eq("board_id",boardId).eq("school_id",board.data.school_id).order("id")),
      readAll(admin.from("learning_board_group_assignments").select("id,group_id,status").eq("board_id",boardId).eq("status","active").order("id")),
      readAll(admin.from("learning_board_games").select("game_id").eq("board_id",boardId).order("id")),
      readAll(admin.from("groups").select("id,name,is_active").eq("school_id",board.data.school_id).order("id")),
    ]);
    const groupIds=groups.map(g=>g.id);
    const members=groupIds.length?await readAll(admin.from("group_members").select("group_id,user_id").in("group_id",groupIds).order("group_id").order("user_id")):[];
    const assignmentIds=assignments.map(a=>a.id);
    const attempts=assignmentIds.length?await readAll(admin.from("attempts").select("assignment_id,game_id,student_id,score,completion_status").in("assignment_id",assignmentIds).order("id")):[];
    const filterClass=params.get("class");if(filterClass)uuid(filterClass);
    const eligible=roster.filter(s=>!filterClass||members.some(m=>m.group_id===filterClass&&m.user_id===s.id));
    const rows: {key:string;student:string;target:string;completed:number;total:number;attempts:number;average_score:number|null}[]=[];
    const add=(student:typeof roster[number],key:string,target:string,assignmentId:string|null)=>{const activity=attempts.filter(a=>a.assignment_id===assignmentId&&a.student_id===student.id);const scores=activity.map(a=>a.score).filter((s):s is number=>s!==null);rows.push({key,student:student.full_name||student.email||"Student",target,completed:new Set(activity.filter(a=>a.completion_status==="completed"&&steps.some(s=>s.game_id===a.game_id)).map(a=>a.game_id)).size,total:steps.length,attempts:activity.length,average_score:scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null});};
    for(const student of eligible){
      for(const a of assignments.filter(a=>a.student_id===student.id&&!a.group_assignment_id&&a.status==="active"))add(student,a.id,"Individual",a.id);
      for(const c of classes.filter(c=>(!filterClass||c.group_id===filterClass)&&groups.some(g=>g.id===c.group_id&&g.is_active)&&members.some(m=>m.group_id===c.group_id&&m.user_id===student.id))){const a=assignments.find(a=>a.group_assignment_id===c.id&&a.student_id===student.id);add(student,`${c.id}:${student.id}`,groups.find(g=>g.id===c.group_id)?.name||"Class",a?.id||null);}
    }
    return NextResponse.json({rows});
  }catch(e){return apiError(e);}
}
