const test = require("node:test"), assert = require("node:assert/strict");
const { liveDetails } = require("./load-typescript.cjs")("lib/scorm/live-details.ts");
test("live accuracy uses reported correct and incorrect interactions",()=>{
 const result = liveDetails({"cmi.interactions.0.id":"quiz-one","cmi.interactions.0.result":"correct","cmi.interactions.0.latency":"00:00:10","cmi.interactions.1.id":"quiz-two","cmi.interactions.1.result":"wrong","cmi.interactions.1.latency":"PT20S"});
 assert.equal(result.answered,2);assert.equal(result.correct,1);assert.equal(result.incorrect,1);assert.equal(result.accuracy,50);assert.equal(result.averageSeconds,15);assert.equal(result.quiz,"quiz-two");
 assert.equal(liveDetails({}).accuracy,null);assert.equal(liveDetails({}).quiz,null);
});
test("package Play and ReportScore events drive live details without early timer start",()=>{
 const vm=require("node:vm"), {scormBridge}=require("./load-typescript.cjs")("lib/scorm/bridge.ts");
 const messages=[],listeners={}, window={ReportScore:()=>{},addEventListener:()=>{}};
 const document={readyState:"complete",addEventListener:(event,fn)=>{listeners[event]=fn;}};
 vm.runInNewContext(scormBridge({},"https://lms.test","attempt"),{window,document,parent:{postMessage:data=>messages.push(structuredClone(data))},setInterval:()=>0});
 assert.equal(messages.filter(m=>m.type==="learnboard-game-start").length,0);
 listeners.click({target:{closest:()=>true}});
 window.ReportScore(1,1,10,false);window.ReportScore(1,2,20,true);
 assert.equal(messages.filter(m=>m.type==="learnboard-game-start").length,1);
 const result=liveDetails(messages.filter(m=>m.type==="learnboard-snapshot").at(-1).raw);
 assert.equal(result.question,1);assert.equal(result.correct,1);assert.equal(result.incorrect,1);assert.equal(result.accuracy,50);
});

test("current question advances without another answer and ignores mode switches",()=>{
 const vm=require("node:vm"),{scormBridge}=require("./load-typescript.cjs")("lib/scorm/bridge.ts");
 const messages=[],listeners={},timers=[];let question=1;
 const window={sentenceBuilderSession:{getQuestionNumber:()=>question},addEventListener:()=>{}};
 vm.runInNewContext(scormBridge({},"https://lms.test","attempt"),{window,document:{readyState:"complete",addEventListener:(e,fn)=>listeners[e]=fn},parent:{postMessage:m=>messages.push(structuredClone(m))},setInterval:fn=>timers.push(fn)});
 timers[0]();assert.equal(messages.filter(m=>m.type==="learnboard-question").length,0);
 listeners.click({target:{closest:()=>true}});timers[0]();question=2;timers[0]();timers[0]();question=3;timers[0]();
 assert.deepEqual(messages.filter(m=>m.type==="learnboard-question").map(m=>m.question),[1,2,3]);
});

test("saved starts and question position are restored before Play",()=>{
 const {hasStarted,restoredQuestion}=require("./load-typescript.cjs")("lib/scorm/live-details.ts");
 assert.equal(hasStarted({}),false);assert.equal(restoredQuestion({}),null);
 assert.equal(hasStarted({"cmi.lumentrail.started":"true"}),true);
 assert.equal(hasStarted({"cmi.interactions.0.result":"correct"}),true);
 assert.equal(restoredQuestion({"cmi.lumentrail.question":"3"}),3);
 assert.equal(restoredQuestion({"cmi.lumentrail.question":"NaN"}),null);
});

test("elapsed time restores safely without adding time spent outside the game",()=>{
 const {savedElapsed}=require("./load-typescript.cjs")("lib/scorm/live-details.ts");
 assert.equal(savedElapsed({"cmi.lumentrail.elapsed":"127"}),127);
 assert.equal(savedElapsed({}),0);assert.equal(savedElapsed({"cmi.lumentrail.elapsed":"-1"}),0);
 assert.equal(savedElapsed({"cmi.lumentrail.elapsed":"Infinity"}),0);
});
