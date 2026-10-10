const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const cache = new Map();
function load(file) {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute);
  const testModule = { exports: {} }; cache.set(absolute,testModule.exports);
  const code=ts.transpileModule(fs.readFileSync(absolute,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const localRequire=name=>name.startsWith("@/")?load(name.slice(2)+".ts"):require(name);
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:absolute})(localRequire,testModule,testModule.exports);
  cache.set(absolute,testModule.exports);return testModule.exports;
}
module.exports=load;
