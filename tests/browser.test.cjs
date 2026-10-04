const test=require("node:test"),assert=require("node:assert/strict"),http=require("node:http"),path=require("node:path"),os=require("node:os"),fs=require("node:fs");
const load=require("./load-typescript.cjs"),{scormBridge}=load("lib/scorm/bridge.ts");
let chromium;
try{({chromium}=require(process.env.LEARNBOARD_PLAYWRIGHT_MODULE||path.join(os.tmpdir(),"learnboard-lms-verification/node_modules/playwright-core")));}catch{}
const chrome=process.env.LEARNBOARD_CHROME||"C:/Program Files/Google/Chrome/Application/chrome.exe";
test("SCORM package sandbox supports APIs, credentialed assets and prevents parent/cookie access",{skip:!chromium||!fs.existsSync(chrome)?"Optional Chrome tooling is not installed":false},async()=>{
 let origin;const prefix="/api/student/content/fixture/unguessable-session-token/";
 const server=http.createServer((req,res)=>{
  if(req.url==="/"){res.setHeader("Set-Cookie","learnboard_test=session; SameSite=Lax; Path=/");res.end(`<html><body><div id="state">Waiting</div><script>window.results=[];window.addEventListener('message',function(e){if(e.source===document.querySelector('iframe').contentWindow&&e.origin==='null'){results.push(e.data);if(e.data.type==='fixture-result')document.getElementById('state').textContent=JSON.stringify(e.data);}});</script><iframe sandbox="allow-scripts allow-forms allow-pointer-lock" src="${prefix}index.html"></iframe></body></html>`);return;}
  if(!req.url.startsWith(prefix)){res.writeHead(403);res.end("Invalid content token");return;}
  res.setHeader("Access-Control-Allow-Origin","null");res.setHeader("Access-Control-Allow-Credentials","true");res.setHeader("Content-Security-Policy","sandbox allow-scripts allow-forms allow-pointer-lock; frame-ancestors 'self'; object-src 'none'");
  if(req.url===prefix+"index.html"){
   res.setHeader("Content-Type","text/html");res.end(`<html><head><script>${scormBridge({"cmi.core.lesson_status":"incomplete"},origin,"fixture")}</script><script src="${prefix}module.js" type="module" crossorigin="use-credentials"></script></head><body><script>(async function(){var isolated=false,cookies=false;try{parent.document.body}catch(e){isolated=true;}try{document.cookie}catch(e){cookies=true;}API.LMSInitialize('');API.LMSSetValue('cmi.core.lesson_status','completed');API.LMSCommit('');var response=await fetch('./data.json');var data=await response.json();var xhr=await new Promise(function(resolve){var x=new XMLHttpRequest();x.open('GET','./data.json');x.onload=function(){resolve(x.status)};x.send()});parent.postMessage({type:'fixture-result',isolated:isolated,cookies:cookies,fetch:data.ok,xhr:xhr},'${origin}');})()</script></body></html>`);
  }else if(req.url===prefix+"data.json"){res.setHeader("Content-Type","application/json");res.end('{"ok":true}');}
  else if(req.url===prefix+"module.js"){res.setHeader("Content-Type","text/javascript");res.end(`import value from './dependency.js';parent.postMessage({type:'fixture-module',ok:value},'${origin}');`);}
  else if(req.url===prefix+"dependency.js"){res.setHeader("Content-Type","text/javascript");res.end("export default true;");}
  else{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:chrome,headless:true,args:["--disable-gpu"]});
 try{const page=await browser.newPage();await page.goto(origin);await page.waitForFunction(()=>window.results.some(r=>r.type==="fixture-result")&&window.results.some(r=>r.type==="fixture-module"));const results=await page.evaluate(()=>window.results);const result=results.find(r=>r.type==="fixture-result");assert.equal(result.isolated,true);assert.equal(result.cookies,true);assert.equal(result.fetch,true);assert.equal(result.xhr,200);assert.equal(results.find(r=>r.type==="fixture-module").ok,true);assert.equal(results.find(r=>r.type==="learnboard-runtime").raw["cmi.core.lesson_status"],"completed");}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});

test("production app denies unauthenticated and cross-origin mutations",{skip:!process.env.LEARNBOARD_TEST_URL?"Set LEARNBOARD_TEST_URL to a running production preview":false},async()=>{
 const origin=process.env.LEARNBOARD_TEST_URL;
 for(const route of ["/admin/paths","/admin/assignments","/admin/reports","/admin/settings","/student"]){const response=await fetch(origin+route,{redirect:"manual"}); if ([307,308].includes(response.status)) assert.equal(response.headers.get("location"),"/"); else { assert.equal(response.status,200); assert.match(await response.text(),/NEXT_REDIRECT|http-equiv="refresh"/); }}
 for(const route of ["/api/admin/reports","/api/admin/reports/progress"]){assert.equal((await fetch(origin+route)).status,401);}
 const post=await fetch(origin+"/api/student/launch",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});assert.equal(post.status,401);
 const csrf=await fetch(origin+"/api/admin/assignments",{method:"POST",headers:{Origin:"null","Content-Type":"application/json"},body:"{}"});assert.equal(csrf.status,403);
});
