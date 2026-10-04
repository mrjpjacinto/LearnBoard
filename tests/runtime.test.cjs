const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm");
const load=require("./load-typescript.cjs");
const {availability,normalizeScore,parseSessionTime}=load("lib/lms/rules.ts");
const {validateRuntime}=load("lib/scorm/runtime.ts");
const {scormBridge}=load("lib/scorm/bridge.ts");
test("availability uses opening inclusive and closing exclusive boundaries",()=>{
 const schedule={status:"active",available_from:"2026-01-01T00:00:00Z",available_until:"2026-01-02T00:00:00Z"};
 assert.equal(availability(schedule,Date.parse(schedule.available_from)-1),"Upcoming");assert.equal(availability(schedule,Date.parse(schedule.available_from)),"Available");assert.equal(availability(schedule,Date.parse(schedule.available_until)),"Closed");assert.equal(availability({...schedule,status:"archived"}),"Archived");
});
test("scores normalize SCORM ranges and enforce assignment passing score",()=>{
 assert.equal(normalizeScore(15,0,20,null),75);assert.equal(normalizeScore(null,null,null,0.8),80);
 const result=validateRuntime({"cmi.core.lesson_status":"passed","cmi.core.score.raw":"60","cmi.core.score.max":"100"},"1.2",70);
 assert.equal(result.completion,"completed");assert.equal(result.success,"failed");assert.equal(result.score,60);
 const newer=validateRuntime({"cmi.completion_status":"completed","cmi.score.scaled":"0.9","cmi.success_status":"unknown"},"2004",80);assert.equal(newer.success,"passed");
});
test("runtime rejects malformed scores, statuses, oversized suspend data and session time",()=>{
 for(const raw of [{"cmi.score.scaled":"Infinity"},{"cmi.completion_status":"invented"},{"cmi.suspend_data":"x".repeat(65000)},{"cmi.session_time":"1 hour"}])assert.throws(()=>validateRuntime(raw,"2004",70));
 assert.throws(()=>validateRuntime({"cmi.suspend_data":"x".repeat(4097)},"1.2",70));assert.throws(()=>validateRuntime({"unexpected":"value"},"1.2",70));
 assert.equal(parseSessionTime("0001:02:03.45"),3723);assert.equal(parseSessionTime("PT1H2M3.45S"),3723);assert.equal(parseSessionTime("00:70:00"),null);
});
test("sandbox bridge exposes synchronous SCORM APIs, sends snapshots and authenticates acknowledgments",()=>{
 const messages=[],listeners={},parent={postMessage:(data,origin)=>messages.push({data:structuredClone(data),origin})};
 const window={addEventListener:(name,fn)=>listeners[name]=fn};
 vm.runInNewContext(scormBridge({"cmi.core.lesson_status":"incomplete","cmi.core.student_id":"student"},"https://lms.test","attempt"),{window,parent,setInterval:()=>0});
 assert.equal(window.API.LMSGetValue("cmi.core.lesson_status"),"");assert.equal(window.API.LMSInitialize(""),"true");assert.equal(window.API.LMSInitialize(""),"false");
 assert.equal(window.API.LMSSetValue("cmi.core.student_id","attacker"),"false");assert.equal(window.API.LMSSetValue("cmi.core.lesson_status","completed"),"true");assert.equal(window.API.LMSGetValue("cmi.core.lesson_status"),"completed");
 assert.equal(window.API.LMSCommit(""),"true");const commit=messages.find(m=>m.data.type==="learnboard-runtime");assert.equal(commit.origin,"https://lms.test");assert.equal(commit.data.raw["cmi.core.lesson_status"],"completed");
 listeners.message({source:{},origin:"https://lms.test",data:{channel:"attempt",type:"learnboard-save-result",ok:false}});assert.equal(window.API.LMSGetLastError(),"0");
 listeners.message({source:parent,origin:"https://lms.test",data:{channel:"attempt",type:"learnboard-save-result",ok:false}});assert.equal(window.API.LMSGetLastError(),"101");
 assert.equal(window.API.LMSFinish(""),"true");assert.equal(window.API.LMSSetValue("cmi.core.lesson_status","incomplete"),"false");
});
