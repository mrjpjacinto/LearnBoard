const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
module.exports=(file,imports)=>{
 const testModule={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const req=name=>name==='server-only'?{}:Object.hasOwn(imports,name)?imports[name]:require(name);
 vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(req,testModule,testModule.exports);return testModule.exports;
};
