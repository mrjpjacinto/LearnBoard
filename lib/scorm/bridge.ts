// Runs inside an opaque sandbox. Package JavaScript cannot access LMS cookies or DOM.
export function scormBridge(initial: Record<string, string>, parentOrigin: string, channel: string) {
  const seed = JSON.stringify({ initial, parentOrigin, channel }).replaceAll("<", "\\u003c");
  return `(function(){"use strict";var cfg=${seed},data=cfg.initial,initialized=false,ended=false,error="0";
var pending=0;function tell(finish){parent.postMessage({type:"learnboard-runtime",channel:cfg.channel,raw:data,finish:finish},cfg.parentOrigin);pending++;}
var contentPrefix=cfg.parentOrigin+"/api/student/content/"+encodeURIComponent(cfg.channel)+"/";
function isContent(url){try{return new URL(url,location.href).href.indexOf(contentPrefix)===0;}catch(e){return false;}}
if(window.fetch){var nativeFetch=window.fetch.bind(window);window.fetch=function(input,options){var url=typeof input==="string"||input instanceof URL?String(input):input.url;if(isContent(url)){options=Object.assign({},options,{credentials:"include"});}return nativeFetch(input,options);};}
if(window.XMLHttpRequest){var open=XMLHttpRequest.prototype.open,send=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.open=function(method,url){this.__learnboardContent=isContent(url);return open.apply(this,arguments);};XMLHttpRequest.prototype.send=function(){if(this.__learnboardContent)this.withCredentials=true;return send.apply(this,arguments);};}
function init(){if(initialized){error="103";return "false";}if(ended){error="104";return "false";}initialized=true;error="0";return "true";}
function ready(){if(!initialized||ended){error="301";return false;}return true;}
function get(k){if(!ready())return "";error="0";if(k.endsWith("._count")){var prefix=k.slice(0,-6)+".",indices={};Object.keys(data).forEach(function(v){if(v.indexOf(prefix)===0){var n=v.slice(prefix.length).split(".")[0];if(/^\\d+$/.test(n))indices[n]=true;}});return String(Object.keys(indices).length);}return Object.prototype.hasOwnProperty.call(data,k)?data[k]:"";}
function set(k,v){if(!ready())return "false";if(!/^cmi\\.[a-zA-Z0-9_.]+$/.test(k)){error="401";return "false";}if(/(?:student_id|student_name|learner_id|learner_name|total_time|entry|mode|credit|\\._count|\\._children)$/.test(k)){error="403";return "false";}data[k]=String(v);error="0";parent.postMessage({type:"learnboard-snapshot",channel:cfg.channel,raw:data},cfg.parentOrigin);return "true";}
function commit(){if(!ready())return "false";tell(false);return error==="0"?"true":"false";}
function finish(){if(!ready())return "false";tell(true);ended=true;return "true";}
function diagnostic(){return error==="0"?"":"The learning session could not save. Check the player status.";}
window.API={LMSInitialize:init,LMSGetValue:get,LMSSetValue:set,LMSCommit:commit,LMSFinish:finish,LMSGetLastError:function(){return error;},LMSGetErrorString:diagnostic,LMSGetDiagnostic:diagnostic};
window.API_1484_11={Initialize:init,GetValue:get,SetValue:set,Commit:commit,Terminate:finish,GetLastError:function(){return error;},GetErrorString:diagnostic,GetDiagnostic:diagnostic};
var gameStarted=false;
function startGame(){if(gameStarted)return;gameStarted=true;parent.postMessage({type:"learnboard-game-start",channel:cfg.channel},cfg.parentOrigin);}
document.addEventListener("click",function(e){if(e.target&&e.target.closest&&e.target.closest("#play-button"))startGame();},true);
function connectReportScore(){var original=window.ReportScore;if(typeof original!=="function"||original.__learnboardWrapped)return;var wrapped=function(quiz,attempt,speed,correct){var result=original.apply(this,arguments);if(typeof quiz==="number"&&typeof attempt==="number"&&typeof speed==="number"&&isFinite(speed)&&speed>=0&&typeof correct==="boolean"){startGame();var index=Object.keys(data).filter(function(k){return /^cmi\\.interactions\\.\\d+\\.id$/.test(k);}).length;var prefix="cmi.interactions."+index+".";data[prefix+"id"]=String(quiz);data[prefix+"result"]=correct?"correct":"incorrect";data[prefix+"latency"]="PT"+speed+"S";parent.postMessage({type:"learnboard-snapshot",channel:cfg.channel,raw:data},cfg.parentOrigin);}return result;};wrapped.__learnboardWrapped=true;window.ReportScore=wrapped;}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",connectReportScore,{once:true});else connectReportScore();
window.addEventListener("message",function(e){if(e.source!==parent||e.origin!==cfg.parentOrigin||!e.data||e.data.channel!==cfg.channel)return;if(e.data.type==="learnboard-save-result"){pending=Math.max(0,pending-1);error=e.data.ok?"0":"101";}});
window.addEventListener("pagehide",function(){if(initialized&&!ended)tell(false);});
setInterval(function(){if(initialized&&!ended&&pending===0)tell(false);},15000);
parent.postMessage({type:"learnboard-ready",channel:cfg.channel},cfg.parentOrigin);
})();`;
}
