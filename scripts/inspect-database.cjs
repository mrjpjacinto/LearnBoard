// Read-only inspection of the existing LearnBoard Database. Never prints keys.
const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');
loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing existing Supabase connection settings.');
const db = createClient(url, key, { auth: { persistSession: false } });
(async () => {
  const profiles = await db.from('profiles').select('id,full_name,role,school_id,is_active');
  console.log(JSON.stringify({ profiles: profiles.data, error: profiles.error }));
  const tables = ['schools', 'groups', 'group_members', 'games', 'subjects', 'skills', 'scorm_packages', 'learning_boards', 'assignments', 'attempts', 'scorm_runtime_data'];
  const counts = await Promise.all(tables.map(async table => {
    const r = await db.from(table).select('*', { count: 'exact', head: true });
    return { table, count: r.count, error: r.error };
  }));
  console.log(JSON.stringify({ counts }));
  const response = await fetch(url + '/rest/v1/', { headers: { apikey: key, Authorization: 'Bearer ' + key } });
  const schema = await response.json();
  console.log(JSON.stringify({ schemaStatus: response.status,
    columns: Object.fromEntries(Object.entries(schema.definitions || {}).map(([table, def]) => [table, Object.keys(def.properties || {})])),
    functions: Object.keys(schema.paths || {}).filter(path => path.startsWith('/rpc/')) }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
