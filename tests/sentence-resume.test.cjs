const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {sentenceResume}=require('./load-typescript.cjs')('lib/scorm/sentence-resume.ts');
const fixture=`const sentences=['ONE','TWO','THREE','FOUR'];const sharedRemainingSentences = [...sentences];let sharedCurrentSentence=null,sharedQuestionState=null;
function createSharedQuestionState(sentence){return {sentence,answers:[null],attempt:0,elapsedTime:0};}
window.sentenceBuilderSession={getProgress(){return sharedQuestionState;}};
        function sentenceAudioKey(sentence) {return sentence;}
`;
test('reopening restores question three and partial answer state',()=>{
 const saved={version:1,remaining:['THREE','FOUR'],progress:{sentence:'THREE',answers:['word'],attempt:1,elapsedTime:12}};
 const window={};vm.runInNewContext(sentenceResume(fixture,{'cmi.lumentrail.sentence_state':JSON.stringify(saved)}),{window});
 assert.deepEqual(JSON.parse(window.sentenceBuilderSession.exportResume()),saved);
});
test('unrelated packages stay unchanged and corrupt state starts safely',()=>{
 assert.equal(sentenceResume('<html>other</html>',{}),'<html>other</html>');
 const window={};vm.runInNewContext(sentenceResume(fixture,{'cmi.lumentrail.sentence_state':'broken'}),{window});
 assert.equal(JSON.parse(window.sentenceBuilderSession.exportResume()).remaining.length,4);
 assert.ok(!sentenceResume(fixture,{'cmi.lumentrail.sentence_state':'</script>'}).includes('</script>'));
});
