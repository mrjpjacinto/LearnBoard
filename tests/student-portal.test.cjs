const test = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-typescript.cjs");
const { learningState, completedGames, permittedAttempts } = load("lib/lms/student-portal.ts");
const now = Date.parse("2026-10-05T00:00:00Z");
const item = { status: "active", available_from: null, available_until: null, games: [{id:"one"},{id:"two"}], attempts: [] };
test("portal respects schedule boundaries and retains completed history", () => {
  assert.equal(learningState(item,now),"Current");
  assert.equal(learningState({...item,status:"scheduled",available_from:new Date(now+1).toISOString()},now),"Upcoming");
  assert.equal(learningState({...item,available_from:new Date(now).toISOString()},now),"Current");
  assert.equal(learningState({...item,available_until:new Date(now).toISOString()},now),"Expired");
  const attempts = [{game_id:"one",completion_status:"completed"},{game_id:"one",completion_status:"completed"},{game_id:"two",completion_status:"completed"}];
  assert.equal(completedGames({...item,attempts}),2);
  assert.equal(learningState({...item,attempts,status:"expired"},now),"Completed");
});
test("hidden grades and package metadata are removed before portal serialization", () => {
  const raw = [{id:"attempt",score:90,success_status:"passed",package_id:"private",completion_status:"completed"}];
  const hidden = permittedAttempts(raw,false)[0];
  assert.equal(hidden.score,null); assert.equal(hidden.success_status,null); assert.equal(hidden.package_id,null);
  assert.equal(hidden.completion_status,"completed"); assert.equal(raw[0].score,90);
  assert.equal(permittedAttempts(raw,true)[0].score,90);
});
