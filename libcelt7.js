
var Module = (() => {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  if (typeof __filename !== 'undefined') _scriptDir ||= __filename;
  return (
function(moduleArg = {}) {

var b=moduleArg,f,k;b.ready=new Promise((a,c)=>{f=a;k=c});var n=Object.assign({},b),q="object"==typeof window,r="function"==typeof importScripts,u="object"==typeof process&&"object"==typeof process.versions&&"string"==typeof process.versions.node,w="",x,y,z;
if(u){var fs=null,A=require("path");w=r?A.dirname(w)+"/":__dirname+"/";x=(a,c)=>{a=B(a)?new URL(a):A.normalize(a);return fs.readFileSync(a,c?void 0:"utf8")};z=a=>{a=x(a,!0);a.buffer||(a=new Uint8Array(a));return a};y=(a,c,d,e=!0)=>{a=B(a)?new URL(a):A.normalize(a);fs.readFile(a,e?void 0:"utf8",(l,v)=>{l?d(l):c(e?v.buffer:v)})};process.argv.slice(2)}else if(q||r)r?w=self.location.href:"undefined"!=typeof document&&document.currentScript&&(w=document.currentScript.src),_scriptDir&&(w=_scriptDir),
w.startsWith("blob:")?w="":w=w.substr(0,w.replace(/[?#].*/,"").lastIndexOf("/")+1),x=a=>{var c=new XMLHttpRequest;c.open("GET",a,!1);c.send(null);return c.responseText},r&&(z=a=>{var c=new XMLHttpRequest;c.open("GET",a,!1);c.responseType="arraybuffer";c.send(null);return new Uint8Array(c.response)}),y=(a,c,d)=>{var e=new XMLHttpRequest;e.open("GET",a,!0);e.responseType="arraybuffer";e.onload=()=>{200==e.status||0==e.status&&e.response?c(e.response):d()};e.onerror=d;e.send(null)};
var aa=b.print||console.log.bind(console),C=b.printErr||console.error.bind(console);Object.assign(b,n);n=null;var D;b.wasmBinary&&(D=b.wasmBinary);"object"!=typeof WebAssembly&&E("no native wasm support detected");var F,G=!1,H,I,J=[],N=[],O=[];function da(){var a=b.preRun.shift();J.unshift(a)}var P=0,Q=null,R=null;function E(a){b.onAbort?.(a);a="Aborted("+a+")";C(a);G=!0;a=new WebAssembly.RuntimeError(a+". Build with -sASSERTIONS for more info.");k(a);throw a;}
var S=a=>a.startsWith("data:application/octet-stream;base64,"),B=a=>a.startsWith("file://"),T;T="libcelt7.wasm";if(!S(T)){var U=T;T=b.locateFile?b.locateFile(U,w):w+U}function V(a){if(a==T&&D)return new Uint8Array(D);if(z)return z(a);throw"both async and sync fetching of the wasm failed";}
function ea(a){if(!D&&(q||r)){if("function"==typeof fetch&&!B(a))return fetch(a,{credentials:"same-origin"}).then(c=>{if(!c.ok)throw`failed to load wasm binary file at '${a}'`;return c.arrayBuffer()}).catch(()=>V(a));if(y)return new Promise((c,d)=>{y(a,e=>c(new Uint8Array(e)),d)})}return Promise.resolve().then(()=>V(a))}function W(a,c,d){return ea(a).then(e=>WebAssembly.instantiate(e,c)).then(d,e=>{C(`failed to asynchronously prepare wasm: ${e}`);E(e)})}
function fa(a,c){var d=T;return D||"function"!=typeof WebAssembly.instantiateStreaming||S(d)||B(d)||u||"function"!=typeof fetch?W(d,a,c):fetch(d,{credentials:"same-origin"}).then(e=>WebAssembly.instantiateStreaming(e,a).then(c,function(l){C(`wasm streaming compile failed: ${l}`);C("falling back to ArrayBuffer instantiation");return W(d,a,c)}))}
var X=a=>{for(;0<a.length;)a.shift()(b)},ha=[null,[],[]],ia="undefined"!=typeof TextDecoder?new TextDecoder("utf8"):void 0,ja={a:()=>{E("")},e:(a,c,d)=>H.copyWithin(a,c,c+d),d:()=>{E("OOM")},f:()=>52,c:function(){return 70},b:(a,c,d,e)=>{for(var l=0,v=0;v<d;v++){var ka=I[c>>2],ba=I[c+4>>2];c+=8;for(var K=0;K<ba;K++){var g=H[ka+K],L=ha[a];if(0===g||10===g){g=L;for(var m=0,p=m+NaN,t=m;g[t]&&!(t>=p);)++t;if(16<t-m&&g.buffer&&ia)g=ia.decode(g.subarray(m,t));else{for(p="";m<t;){var h=g[m++];if(h&128){var M=
g[m++]&63;if(192==(h&224))p+=String.fromCharCode((h&31)<<6|M);else{var ca=g[m++]&63;h=224==(h&240)?(h&15)<<12|M<<6|ca:(h&7)<<18|M<<12|ca<<6|g[m++]&63;65536>h?p+=String.fromCharCode(h):(h-=65536,p+=String.fromCharCode(55296|h>>10,56320|h&1023))}}else p+=String.fromCharCode(h)}g=p}(1===a?aa:C)(g);L.length=0}else L.push(g)}l+=ba}I[e>>2]=l;return 0}},Y=function(){function a(d){Y=d.exports;F=Y.g;d=F.buffer;b.HEAP8=new Int8Array(d);b.HEAP16=new Int16Array(d);b.HEAPU8=H=new Uint8Array(d);b.HEAPU16=new Uint16Array(d);
b.HEAP32=new Int32Array(d);b.HEAPU32=I=new Uint32Array(d);b.HEAPF32=new Float32Array(d);b.HEAPF64=new Float64Array(d);N.unshift(Y.h);P--;b.monitorRunDependencies?.(P);0==P&&(null!==Q&&(clearInterval(Q),Q=null),R&&(d=R,R=null,d()));return Y}var c={a:ja};P++;b.monitorRunDependencies?.(P);if(b.instantiateWasm)try{return b.instantiateWasm(c,a)}catch(d){C(`Module.instantiateWasm callback failed with error: ${d}`),k(d)}fa(c,function(d){a(d.instance)}).catch(k);return{}}();
b._celt_encoder_create=(a,c,d)=>(b._celt_encoder_create=Y.i)(a,c,d);b._celt_encoder_destroy=a=>(b._celt_encoder_destroy=Y.j)(a);b._celt_encode_float=(a,c,d,e,l)=>(b._celt_encode_float=Y.k)(a,c,d,e,l);b._celt_encode=(a,c,d,e,l)=>(b._celt_encode=Y.l)(a,c,d,e,l);b._celt_encoder_ctl=(a,c,d)=>(b._celt_encoder_ctl=Y.m)(a,c,d);b._celt_decoder_create=(a,c,d)=>(b._celt_decoder_create=Y.n)(a,c,d);b._celt_decoder_destroy=a=>(b._celt_decoder_destroy=Y.o)(a);
b._celt_decode_float=(a,c,d,e)=>(b._celt_decode_float=Y.p)(a,c,d,e);b._celt_decode=(a,c,d,e)=>(b._celt_decode=Y.q)(a,c,d,e);b._celt_decoder_ctl=(a,c,d)=>(b._celt_decoder_ctl=Y.r)(a,c,d);b._celt_strerror=a=>(b._celt_strerror=Y.s)(a);b._celt_mode_info=(a,c,d)=>(b._celt_mode_info=Y.t)(a,c,d);b._celt_mode_create=(a,c,d)=>(b._celt_mode_create=Y.u)(a,c,d);b._celt_mode_destroy=a=>(b._celt_mode_destroy=Y.v)(a);b._malloc=a=>(b._malloc=Y.w)(a);b._free=a=>(b._free=Y.x)(a);var Z;
R=function la(){Z||ma();Z||(R=la)};
function ma(){function a(){if(!Z&&(Z=!0,b.calledRun=!0,!G)){X(N);f(b);if(b.onRuntimeInitialized)b.onRuntimeInitialized();if(b.postRun)for("function"==typeof b.postRun&&(b.postRun=[b.postRun]);b.postRun.length;){var c=b.postRun.shift();O.unshift(c)}X(O)}}if(!(0<P)){if(b.preRun)for("function"==typeof b.preRun&&(b.preRun=[b.preRun]);b.preRun.length;)da();X(J);0<P||(b.setStatus?(b.setStatus("Running..."),setTimeout(function(){setTimeout(function(){b.setStatus("")},1);a()},1)):a())}}
if(b.preInit)for("function"==typeof b.preInit&&(b.preInit=[b.preInit]);0<b.preInit.length;)b.preInit.pop()();ma();


  return moduleArg.ready
}
);
})();
if (typeof exports === 'object' && typeof module === 'object')
  module.exports = Module;
else if (typeof define === 'function' && define['amd'])
  define([], () => Module);
Module.instance = Module();
module.exports = Module;
