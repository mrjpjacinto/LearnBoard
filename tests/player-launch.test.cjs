const test = require('node:test');
const assert = require('node:assert/strict');
const mock = require('./mock-module.cjs');
class LmsError extends Error { constructor(message, status) { super(message); this.status = status; } }
const api = mock('lib/scorm/player-launch.ts', {
  '@/lib/lms/auth': {LmsError, checkDb: error => {if (error) throw error;}},
});
function fixture(resume = false, snapshotResume = resume) {
  let stored = {session_token: 'token', allow_resume: snapshotResume, passing_score: 70};
  const admin = {from() {
    let values; const filters = [];
    const query = {
      update(value) {values = value; return query;},
      eq(key, value) {filters.push([key, value]); return query;},
      is(key, value) {filters.push([key, value]); return query;},
      select() {return query;},
      async maybeSingle() {
        const expected = filters.find(([key]) => key === 'launch_config')[1];
        if (JSON.stringify(stored) !== expected) return {data: null, error: null};
        stored = values.launch_config;
        return {data: {id: 'attempt'}, error: null};
      },
    }; return query;
  }};
  return {
    session: () => ({admin, attempt: {id: 'attempt'}, schedule: {allow_resume: resume}, config: {...stored}}),
    change: values => {stored = {...stored, ...values};},
  };
}
test('no-resume attempt opens once and retains grading configuration', async () => {
  const f = fixture(); await api.claimPlayerLaunch(f.session());
  assert.equal(f.session().config.passing_score, 70);
  assert.throws(() => api.assertPlayerCanOpen(f.session()), error => error.status === 403);
  await assert.rejects(api.claimPlayerLaunch(f.session()), error => error.status === 403);
});
test('simultaneous no-resume opens allow only one request', async () => {
  const f = fixture(); const first = f.session(), second = f.session();
  const results = await Promise.allSettled([api.claimPlayerLaunch(first), api.claimPlayerLaunch(second)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.status, 409);
});
test('resumable launches can reopen, but both assignment and attempt must allow resume', async () => {
  const f = fixture(true); await api.claimPlayerLaunch(f.session()); await api.claimPlayerLaunch(f.session());
  for (const [current, snapshot] of [[false, true], [true, false]]) {
    const blocked = fixture(current, snapshot); await api.claimPlayerLaunch(blocked.session());
    assert.throws(() => api.assertPlayerCanOpen(blocked.session()), error => error.status === 403);
  }
});
test('launch claims cannot overwrite concurrent session or removal changes', async () => {
  const f = fixture(); const stale = f.session(); f.change({path_removal_finish: true});
  await assert.rejects(api.claimPlayerLaunch(stale), error => error.status === 409);
  assert.equal(f.session().config.path_removal_finish, true);
});
