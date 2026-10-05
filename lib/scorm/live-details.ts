import { parseSessionTime } from "@/lib/lms/rules";
export function liveDetails(raw: Record<string,string>) {
  const indices = [...new Set(Object.keys(raw).flatMap(k => { const m = /^cmi\.interactions\.(\d+)\./.exec(k); return m ? [Number(m[1])] : []; }))].sort((a,b)=>a-b);
  const answers = indices.map(i=>({ id:raw[`cmi.interactions.${i}.id`] || null, result:raw[`cmi.interactions.${i}.result`], latency:parseSessionTime(raw[`cmi.interactions.${i}.latency`]) }));
  const answered = answers.filter(a=>a.result && a.result!=="unanticipated");
  const correct = answered.filter(a=>a.result==="correct").length, incorrect = answered.filter(a=>["incorrect","wrong"].includes(a.result)).length;
  const times = answered.filter(a=>a.latency!==null && a.latency!>0).map(a=>a.latency!);
  return { question: Math.max(1,...answers.map(a=>Number(a.id)).filter(Number.isFinite)), answered:answered.length, correct, incorrect, accuracy:correct+incorrect ? Math.round(correct/(correct+incorrect)*100) : null, quiz:answers.at(-1)?.id || null, averageSeconds:times.length ? Math.round(times.reduce((n,s)=>n+s,0)/times.length) : null };
}
