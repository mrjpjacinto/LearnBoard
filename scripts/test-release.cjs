// Automated release checks fail if required integration tests would be skipped.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const modules=[process.env.LEARNBOARD_PGLITE_MODULE||path.join(os.tmpdir(),'learnboard-lms-verification/node_modules/@electric-sql/pglite'),process.env.LEARNBOARD_PLAYWRIGHT_MODULE||path.join(os.tmpdir(),'learnboard-lms-verification/node_modules/playwright-core')];
for(const modulePath of modules){try{require.resolve(modulePath)}catch{throw new Error('Required integration module unavailable: '+modulePath+'. Supply the documented test module path; no packages are installed automatically.')}}
const chrome=process.env.LEARNBOARD_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe';
if(!fs.existsSync(chrome))throw new Error('Set LEARNBOARD_CHROME to the installed test browser.');
if(!process.env.LEARNBOARD_TEST_URL)throw new Error('Set LEARNBOARD_TEST_URL to a running local production server or approved private preview.');
const url=new URL(process.env.LEARNBOARD_TEST_URL);if(!['http:','https:'].includes(url.protocol))throw new Error('Invalid preview URL.');
const tests=fs.readdirSync('tests').filter(p=>p.endsWith('.test.cjs')).map(p=>'tests/'+p);
const child=spawn(process.execPath,['--test',...tests],{stdio:['ignore','pipe','inherit'],windowsHide:true});let output='';
child.stdout.on('data',data=>{output+=data;process.stdout.write(data)});
child.on('error',()=>{process.exitCode=1});
child.on('close',code=>{const skipped=/^(?:ℹ|#) skipped ([1-9]\d*)/m.test(output);if(skipped)console.error('Release check failed: required tests were skipped.');process.exitCode=code|| (skipped?1:0)});
