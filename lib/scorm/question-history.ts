import { parseSessionTime } from "@/lib/lms/rules";
export function questionHistory(raw:Record<string,string>) {
 const attempts=new Map<string,number>(), times=new Map<string,number>();let previousElapsed=0;
 return Object.keys(raw).filter(k=>/^cmi\.interactions\.\d+\.result$/.test(k)).sort((a,b)=>Number(a.split('.')[2])-Number(b.split('.')[2])).map(k=>{
  const prefix=k.replace(/result$/,''),question=raw[prefix+'id'] || '—';
  const attempt=(attempts.get(question)||0)+1;attempts.set(question,attempt);
  const cumulative=raw[prefix+'lumentrail_elapsed']===undefined ? null : Number(raw[prefix+'lumentrail_elapsed']);
  const latency=parseSessionTime(raw[prefix+'latency']);let duration:number|null=null;
  if(cumulative!==null && Number.isFinite(cumulative) && cumulative>=previousElapsed){duration=cumulative-previousElapsed;previousElapsed=cumulative;}
  else if(latency!==null){duration=Math.max(0,latency-(times.get(question)||0));times.set(question,latency);}
  return {question,attempt,result:raw[k]==='correct' ? 'Correct' : ['wrong','incorrect'].includes(raw[k]) ? 'Incorrect' : 'Not assessed',speed:duration===null ? '—' : Number(duration.toFixed(2))+' sec'};
 });
}
