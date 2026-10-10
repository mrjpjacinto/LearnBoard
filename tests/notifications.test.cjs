const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function setup() {
  const timers = new Map(); let timerId = 0;
  const jsx = (type, props) => ({type, props});
  const react = {useEffect: effect => effect(), useState: value => [value, () => {}], useCallback: callback => callback, useSyncExternalStore: (_, snapshot) => snapshot()};
  const testModule = {exports: {}};
  const code = ts.transpileModule(fs.readFileSync('components/LmsToast.tsx','utf8'), {compilerOptions: {module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code, {module: testModule, exports: testModule.exports, require: name => name === 'react' ? react : {jsx, jsxs:jsx}, setTimeout: (callback, delay) => {timers.set(++timerId,{callback,delay});return timerId;}, clearTimeout: id => timers.delete(id)});
  return {...testModule.exports, timers, cards() {return this.ToastViewport().props.children;}};
}
test('notifications stack across callers and repeated feedback is deduplicated', () => {
 const api=setup(); api.showToast({type:'success',message:'Saved.'}); api.Notification({type:'error',message:'Failed.'});
 assert.equal(api.cards().length,2); api.showToast({type:'success',message:'Saved.'}); assert.equal(api.cards().length,2); assert.equal(api.timers.size,2);
});
test('notifications expire and can be dismissed without dismissing other messages', () => {
 const api=setup(); api.showToast({type:'success',message:'Saved.'}); api.showToast({type:'error',message:'Failed.'});
 assert.deepEqual(Array.from(api.timers.values(),t=>t.delay),[2000,2000]);
 api.cards()[0].props.children[2].props.onClick(); assert.equal(api.cards().length,1);
 Array.from(api.timers.values())[0].callback(); assert.equal(api.cards().length,0);
});
test('stack remains bounded and supports warning and info feedback', () => {
 const api=setup(); for(let i=0;i<6;i++)api.showToast({type:i%2?'warning':'info',message:'Message '+i});
 assert.equal(api.cards().length,4);assert.equal(api.timers.size,4);
 api.showToast({type:'success',message:' '});assert.equal(api.cards().length,4);
});

test('long notifications allow more reading time with a bounded duration', () => {
 const api=setup(); api.showToast({type:'info',message:Array(20).fill('word').join(' ')}); api.showToast({type:'warning',message:Array(100).fill('word').join(' ')});
 assert.deepEqual(Array.from(api.timers.values(),t=>t.delay),[7000,15000]);
});
