// Adapter for the sentence builder's in-memory session. Storage originals remain unchanged.
export function sentenceResume(html: string, initial: Record<string,string>) {
  const anchor = '        function sentenceAudioKey(sentence) {';
  if (!html.includes('const sharedRemainingSentences = [...sentences];') || !html.includes(anchor)) return html;
  const seed = JSON.stringify(initial['cmi.lumentrail.sentence_state'] || '').replaceAll('<', '\\u003c');
  return html.replace(anchor, `        (function(){
          try {
            const saved = JSON.parse(${seed});
            if (saved.version === 1 && Array.isArray(saved.remaining) && saved.remaining.every(s => sentences.includes(s)) && new Set(saved.remaining).size === saved.remaining.length) {
              sharedRemainingSentences.splice(0, sharedRemainingSentences.length, ...saved.remaining);
              if (saved.progress && saved.remaining.includes(saved.progress.sentence)) {
                sharedCurrentSentence = saved.progress.sentence;
                sharedQuestionState = createSharedQuestionState(sharedCurrentSentence);
                if (Array.isArray(saved.progress.answers) && saved.progress.answers.length === sharedQuestionState.answers.length) sharedQuestionState.answers = saved.progress.answers;
                sharedQuestionState.attempt = Math.max(0, Number(saved.progress.attempt) || 0);
                sharedQuestionState.elapsedTime = Math.max(0, Number(saved.progress.elapsedTime) || 0);
              }
            }
          } catch(e) {}
          window.sentenceBuilderSession.exportResume = function(){return JSON.stringify({version:1,remaining:[...sharedRemainingSentences],progress:this.getProgress()});};
        })();
${anchor}`);
}
