var twitter=function(){"use strict";var Qe=Object.defineProperty;var Xe=(N,$,q)=>$ in N?Qe(N,$,{enumerable:!0,configurable:!0,writable:!0,value:q}):N[$]=q;var j=(N,$,q)=>Xe(N,typeof $!="symbol"?$+"":$,q);var fe,he,pe,we;function N(n){return n}var $=Object.prototype.hasOwnProperty;function q(n,t){var e,r;if(n===t)return!0;if(n&&t&&(e=n.constructor)===t.constructor){if(e===Date)return n.getTime()===t.getTime();if(e===RegExp)return n.toString()===t.toString();if(e===Array){if((r=n.length)===t.length)for(;r--&&q(n[r],t[r]););return r===-1}if(!e||typeof n=="object"){r=0;for(e in n)if($.call(n,e)&&++r&&!$.call(t,e)||!(e in t)||!q(n[e],t[e]))return!1;return Object.keys(t).length===r}}return n!==n&&t!==t}const Ae=new Error("request for lock canceled");var ye=function(n,t,e,r){function s(i){return i instanceof e?i:new e(function(u){u(i)})}return new(e||(e=Promise))(function(i,u){function w(A){try{h(r.next(A))}catch(x){u(x)}}function v(A){try{h(r.throw(A))}catch(x){u(x)}}function h(A){A.done?i(A.value):s(A.value).then(w,v)}h((r=r.apply(n,t||[])).next())})};class be{constructor(t,e=Ae){this._value=t,this._cancelError=e,this._queue=[],this._weightedWaiters=[]}acquire(t=1,e=0){if(t<=0)throw new Error(`invalid weight ${t}: must be positive`);return new Promise((r,s)=>{const i={resolve:r,reject:s,weight:t,priority:e},u=se(this._queue,w=>e<=w.priority);u===-1&&t<=this._value?this._dispatchItem(i):this._queue.splice(u+1,0,i)})}runExclusive(t){return ye(this,arguments,void 0,function*(e,r=1,s=0){const[i,u]=yield this.acquire(r,s);try{return yield e(i)}finally{u()}})}waitForUnlock(t=1,e=0){if(t<=0)throw new Error(`invalid weight ${t}: must be positive`);return this._couldLockImmediately(t,e)?Promise.resolve():new Promise(r=>{this._weightedWaiters[t-1]||(this._weightedWaiters[t-1]=[]),ve(this._weightedWaiters[t-1],{resolve:r,priority:e})})}isLocked(){return this._value<=0}getValue(){return this._value}setValue(t){this._value=t,this._dispatchQueue()}release(t=1){if(t<=0)throw new Error(`invalid weight ${t}: must be positive`);this._value+=t,this._dispatchQueue()}cancel(){this._queue.forEach(t=>t.reject(this._cancelError)),this._queue=[]}_dispatchQueue(){for(this._drainUnlockWaiters();this._queue.length>0&&this._queue[0].weight<=this._value;)this._dispatchItem(this._queue.shift()),this._drainUnlockWaiters()}_dispatchItem(t){const e=this._value;this._value-=t.weight,t.resolve([e,this._newReleaser(t.weight)])}_newReleaser(t){let e=!1;return()=>{e||(e=!0,this.release(t))}}_drainUnlockWaiters(){if(this._queue.length===0)for(let t=this._value;t>0;t--){const e=this._weightedWaiters[t-1];e&&(e.forEach(r=>r.resolve()),this._weightedWaiters[t-1]=[])}else{const t=this._queue[0].priority;for(let e=this._value;e>0;e--){const r=this._weightedWaiters[e-1];if(!r)continue;const s=r.findIndex(i=>i.priority<=t);(s===-1?r:r.splice(0,s)).forEach(i=>i.resolve())}}}_couldLockImmediately(t,e){return(this._queue.length===0||this._queue[0].priority<e)&&t<=this._value}}function ve(n,t){const e=se(n,r=>t.priority<=r.priority);n.splice(e+1,0,t)}function se(n,t){for(let e=n.length-1;e>=0;e--)if(t(n[e]))return e;return-1}var xe=function(n,t,e,r){function s(i){return i instanceof e?i:new e(function(u){u(i)})}return new(e||(e=Promise))(function(i,u){function w(A){try{h(r.next(A))}catch(x){u(x)}}function v(A){try{h(r.throw(A))}catch(x){u(x)}}function h(A){A.done?i(A.value):s(A.value).then(w,v)}h((r=r.apply(n,t||[])).next())})};class Ce{constructor(t){this._semaphore=new be(1,t)}acquire(){return xe(this,arguments,void 0,function*(t=0){const[,e]=yield this._semaphore.acquire(1,t);return e})}runExclusive(t,e=0){return this._semaphore.runExclusive(()=>t(),1,e)}isLocked(){return this._semaphore.isLocked()}waitForUnlock(t=0){return this._semaphore.waitForUnlock(1,t)}release(){this._semaphore.isLocked()&&this._semaphore.release()}cancel(){return this._semaphore.cancel()}}const D=((he=(fe=globalThis.browser)==null?void 0:fe.runtime)==null?void 0:he.id)==null?globalThis.chrome:globalThis.browser,ie=Ee();function Ee(){const n={local:W("local"),session:W("session"),sync:W("sync"),managed:W("managed")},t=l=>{const a=n[l];if(a==null){const o=Object.keys(n).join(", ");throw Error(`Invalid area "${l}". Options: ${o}`)}return a},e=l=>{const a=l.indexOf(":"),o=l.substring(0,a),c=l.substring(a+1);if(c==null)throw Error(`Storage key should be in the form of "area:key", but received "${l}"`);return{driverArea:o,driverKey:c,driver:t(o)}},r=l=>l+"$",s=(l,a)=>{const o={...l};return Object.entries(a).forEach(([c,f])=>{f==null?delete o[c]:o[c]=f}),o},i=(l,a)=>l??a??null,u=l=>typeof l=="object"&&!Array.isArray(l)?l:{},w=async(l,a,o)=>{const c=await l.getItem(a);return i(c,(o==null?void 0:o.fallback)??(o==null?void 0:o.defaultValue))},v=async(l,a)=>{const o=r(a),c=await l.getItem(o);return u(c)},h=async(l,a,o)=>{await l.setItem(a,o??null)},A=async(l,a,o)=>{const c=r(a),f=u(await l.getItem(c));await l.setItem(c,s(f,o))},x=async(l,a,o)=>{if(await l.removeItem(a),o!=null&&o.removeMeta){const c=r(a);await l.removeItem(c)}},I=async(l,a,o)=>{const c=r(a);if(o==null)await l.removeItem(c);else{const f=u(await l.getItem(c));[o].flat().forEach(p=>delete f[p]),await l.setItem(c,f)}},K=(l,a,o)=>l.watch(a,o);return{getItem:async(l,a)=>{const{driver:o,driverKey:c}=e(l);return await w(o,c,a)},getItems:async l=>{const a=new Map,o=new Map,c=[];l.forEach(p=>{let C,E;typeof p=="string"?C=p:"getValue"in p?(C=p.key,E={fallback:p.fallback}):(C=p.key,E=p.options),c.push(C);const{driverArea:L,driverKey:g}=e(C),m=a.get(L)??[];a.set(L,m.concat(g)),o.set(C,E)});const f=new Map;return await Promise.all(Array.from(a.entries()).map(async([p,C])=>{(await n[p].getItems(C)).forEach(L=>{const g=`${p}:${L.key}`,m=o.get(g),d=i(L.value,(m==null?void 0:m.fallback)??(m==null?void 0:m.defaultValue));f.set(g,d)})})),c.map(p=>({key:p,value:f.get(p)}))},getMeta:async l=>{const{driver:a,driverKey:o}=e(l);return await v(a,o)},getMetas:async l=>{const a=l.map(f=>{const p=typeof f=="string"?f:f.key,{driverArea:C,driverKey:E}=e(p);return{key:p,driverArea:C,driverKey:E,driverMetaKey:r(E)}}),o=a.reduce((f,p)=>{var C;return f[C=p.driverArea]??(f[C]=[]),f[p.driverArea].push(p),f},{}),c={};return await Promise.all(Object.entries(o).map(async([f,p])=>{const C=await D.storage[f].get(p.map(E=>E.driverMetaKey));p.forEach(E=>{c[E.key]=C[E.driverMetaKey]??{}})})),a.map(f=>({key:f.key,meta:c[f.key]}))},setItem:async(l,a)=>{const{driver:o,driverKey:c}=e(l);await h(o,c,a)},setItems:async l=>{const a={};l.forEach(o=>{const{driverArea:c,driverKey:f}=e("key"in o?o.key:o.item.key);a[c]??(a[c]=[]),a[c].push({key:f,value:o.value})}),await Promise.all(Object.entries(a).map(async([o,c])=>{await t(o).setItems(c)}))},setMeta:async(l,a)=>{const{driver:o,driverKey:c}=e(l);await A(o,c,a)},setMetas:async l=>{const a={};l.forEach(o=>{const{driverArea:c,driverKey:f}=e("key"in o?o.key:o.item.key);a[c]??(a[c]=[]),a[c].push({key:f,properties:o.meta})}),await Promise.all(Object.entries(a).map(async([o,c])=>{const f=t(o),p=c.map(({key:g})=>r(g));console.log(o,p);const C=await f.getItems(p),E=Object.fromEntries(C.map(({key:g,value:m})=>[g,u(m)])),L=c.map(({key:g,properties:m})=>{const d=r(g);return{key:d,value:s(E[d]??{},m)}});await f.setItems(L)}))},removeItem:async(l,a)=>{const{driver:o,driverKey:c}=e(l);await x(o,c,a)},removeItems:async l=>{const a={};l.forEach(o=>{let c,f;typeof o=="string"?c=o:"getValue"in o?c=o.key:"item"in o?(c=o.item.key,f=o.options):(c=o.key,f=o.options);const{driverArea:p,driverKey:C}=e(c);a[p]??(a[p]=[]),a[p].push(C),f!=null&&f.removeMeta&&a[p].push(r(C))}),await Promise.all(Object.entries(a).map(async([o,c])=>{await t(o).removeItems(c)}))},removeMeta:async(l,a)=>{const{driver:o,driverKey:c}=e(l);await I(o,c,a)},snapshot:async(l,a)=>{var f;const c=await t(l).snapshot();return(f=a==null?void 0:a.excludeKeys)==null||f.forEach(p=>{delete c[p],delete c[r(p)]}),c},restoreSnapshot:async(l,a)=>{await t(l).restoreSnapshot(a)},watch:(l,a)=>{const{driver:o,driverKey:c}=e(l);return K(o,c,a)},unwatch(){Object.values(n).forEach(l=>{l.unwatch()})},defineItem:(l,a)=>{const{driver:o,driverKey:c}=e(l),{version:f=1,migrations:p={}}=a??{};if(f<1)throw Error("Storage item version cannot be less than 1. Initial versions should be set to 1, not 0.");const C=async()=>{var k;const d=r(c),[{value:b},{value:P}]=await o.getItems([c,d]);if(b==null)return;const T=(P==null?void 0:P.v)??1;if(T>f)throw Error(`Version downgrade detected (v${T} -> v${f}) for "${l}"`);console.debug(`[@wxt-dev/storage] Running storage migration for ${l}: v${T} -> v${f}`);const M=Array.from({length:f-T},(_,R)=>T+R+1);let y=b;for(const _ of M)try{y=await((k=p==null?void 0:p[_])==null?void 0:k.call(p,y))??y}catch(R){throw Error(`v${_} migration failed for "${l}"`,{cause:R})}await o.setItems([{key:c,value:y},{key:d,value:{...P,v:f}}]),console.debug(`[@wxt-dev/storage] Storage migration completed for ${l} v${f}`,{migratedValue:y})},E=(a==null?void 0:a.migrations)==null?Promise.resolve():C().catch(d=>{console.error(`[@wxt-dev/storage] Migration failed for ${l}`,d)}),L=new Ce,g=()=>(a==null?void 0:a.fallback)??(a==null?void 0:a.defaultValue)??null,m=()=>L.runExclusive(async()=>{const d=await o.getItem(c);if(d!=null||(a==null?void 0:a.init)==null)return d;const b=await a.init();return await o.setItem(c,b),b});return E.then(m),{key:l,get defaultValue(){return g()},get fallback(){return g()},getValue:async()=>(await E,a!=null&&a.init?await m():await w(o,c,a)),getMeta:async()=>(await E,await v(o,c)),setValue:async d=>(await E,await h(o,c,d)),setMeta:async d=>(await E,await A(o,c,d)),removeValue:async d=>(await E,await x(o,c,d)),removeMeta:async d=>(await E,await I(o,c,d)),watch:d=>K(o,c,(b,P)=>d(b??g(),P??g())),migrate:C}}}}function W(n){const t=()=>{if(D.runtime==null)throw Error(["'wxt/storage' must be loaded in a web extension environment",`
 - If thrown during a build, see https://github.com/wxt-dev/wxt/issues/371`,` - If thrown during tests, mock 'wxt/browser' correctly. See https://wxt.dev/guide/go-further/testing.html
`].join(`
`));if(D.storage==null)throw Error("You must add the 'storage' permission to your manifest to use 'wxt/storage'");const r=D.storage[n];if(r==null)throw Error(`"browser.storage.${n}" is undefined`);return r},e=new Set;return{getItem:async r=>(await t().get(r))[r],getItems:async r=>{const s=await t().get(r);return r.map(i=>({key:i,value:s[i]??null}))},setItem:async(r,s)=>{s==null?await t().remove(r):await t().set({[r]:s})},setItems:async r=>{const s=r.reduce((i,{key:u,value:w})=>(i[u]=w,i),{});await t().set(s)},removeItem:async r=>{await t().remove(r)},removeItems:async r=>{await t().remove(r)},snapshot:async()=>await t().get(),restoreSnapshot:async r=>{await t().set(r)},watch(r,s){const i=u=>{const w=u[r];w!=null&&(q(w.newValue,w.oldValue)||s(w.newValue??null,w.oldValue??null))};return t().onChanged.addListener(i),e.add(i),()=>{t().onChanged.removeListener(i),e.delete(i)}},unwatch(){e.forEach(r=>{t().onChanged.removeListener(r)}),e.clear()}}}const Pe=[EvalError,RangeError,ReferenceError,SyntaxError,TypeError,URIError,globalThis.DOMException,globalThis.AssertionError,globalThis.SystemError].filter(Boolean).map(n=>[n.name,n]),_e=new Map(Pe);class Z extends Error{constructor(e){super(Z._prepareSuperMessage(e));j(this,"name","NonError")}static _prepareSuperMessage(e){try{return JSON.stringify(e)}catch{return String(e)}}}const Te=[{property:"name",enumerable:!1},{property:"message",enumerable:!1},{property:"stack",enumerable:!1},{property:"code",enumerable:!0},{property:"cause",enumerable:!1}],Q=new WeakSet,Se=n=>{Q.add(n);const t=n.toJSON();return Q.delete(n),t},oe=n=>_e.get(n)??Error,X=({from:n,seen:t,to:e,forceEnumerable:r,maxDepth:s,depth:i,useToJSON:u,serialize:w})=>{if(!e)if(Array.isArray(n))e=[];else if(!w&&ae(n)){const h=oe(n.name);e=new h}else e={};if(t.push(n),i>=s)return e;if(u&&typeof n.toJSON=="function"&&!Q.has(n))return Se(n);const v=h=>X({from:h,seen:[...t],forceEnumerable:r,maxDepth:s,depth:i,useToJSON:u,serialize:w});for(const[h,A]of Object.entries(n)){if(A&&A instanceof Uint8Array&&A.constructor.name==="Buffer"){e[h]="[object Buffer]";continue}if(A!==null&&typeof A=="object"&&typeof A.pipe=="function"){e[h]="[object Stream]";continue}if(typeof A!="function"){if(!A||typeof A!="object"){try{e[h]=A}catch{}continue}if(!t.includes(n[h])){i++,e[h]=v(n[h]);continue}e[h]="[Circular]"}}for(const{property:h,enumerable:A}of Te)typeof n[h]<"u"&&n[h]!==null&&Object.defineProperty(e,h,{value:ae(n[h])?v(n[h]):n[h],enumerable:r?!0:A,configurable:!0,writable:!0});return e};function ke(n,t={}){const{maxDepth:e=Number.POSITIVE_INFINITY,useToJSON:r=!0}=t;return typeof n=="object"&&n!==null?X({from:n,seen:[],forceEnumerable:!0,maxDepth:e,depth:0,useToJSON:r,serialize:!0}):typeof n=="function"?`[Function: ${n.name||"anonymous"}]`:n}function Me(n,t={}){const{maxDepth:e=Number.POSITIVE_INFINITY}=t;if(n instanceof Error)return n;if(Ie(n)){const r=oe(n.name);return X({from:n,seen:[],to:new r,maxDepth:e,depth:0,serialize:!1})}return new Z(n)}function ae(n){return!!n&&typeof n=="object"&&"name"in n&&"message"in n&&"stack"in n}function Ie(n){return!!n&&typeof n=="object"&&"message"in n&&!Array.isArray(n)}var Le=Object.defineProperty,Oe=Object.defineProperties,$e=Object.getOwnPropertyDescriptors,le=Object.getOwnPropertySymbols,Ke=Object.prototype.hasOwnProperty,Re=Object.prototype.propertyIsEnumerable,ce=(n,t,e)=>t in n?Le(n,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):n[t]=e,ue=(n,t)=>{for(var e in t||(t={}))Ke.call(t,e)&&ce(n,e,t[e]);if(le)for(var e of le(t))Re.call(t,e)&&ce(n,e,t[e]);return n},ge=(n,t)=>Oe(n,$e(t)),Fe=(n,t,e)=>new Promise((r,s)=>{var i=v=>{try{w(e.next(v))}catch(h){s(h)}},u=v=>{try{w(e.throw(v))}catch(h){s(h)}},w=v=>v.done?r(v.value):Promise.resolve(v.value).then(i,u);w((e=e.apply(n,t)).next())});function je(n){let t,e={};function r(){Object.entries(e).length===0&&(t==null||t(),t=void 0)}let s=Math.floor(Math.random()*1e4);function i(){return s++}return{sendMessage(u,w,...v){return Fe(this,null,function*(){var h,A,x,I;const K={id:i(),type:u,data:w,timestamp:Date.now()},O=(A=yield(h=n.verifyMessageData)==null?void 0:h.call(n,K))!=null?A:K;(x=n.logger)==null||x.debug(`[messaging] sendMessage {id=${O.id}} ─ᐅ`,O,...v);const l=yield n.sendMessage(O,...v),{res:a,err:o}=l??{err:new Error("No response")};if((I=n.logger)==null||I.debug(`[messaging] sendMessage {id=${O.id}} ᐊ─`,{res:a,err:o}),o!=null)throw Me(o);return a})},onMessage(u,w){var v,h,A;if(t==null&&((v=n.logger)==null||v.debug(`[messaging] "${u}" initialized the message listener for this context`),t=n.addRootListener(x=>{var I,K;if(typeof x.type!="string"||typeof x.timestamp!="number"){if(n.breakError)return;const a=Error(`[messaging] Unknown message format, must include the 'type' & 'timestamp' fields, received: ${JSON.stringify(x)}`);throw(I=n.logger)==null||I.error(a),a}(K=n==null?void 0:n.logger)==null||K.debug("[messaging] Received message",x);const O=e[x.type];if(O==null)return;const l=O(x);return Promise.resolve(l).then(a=>{var o,c;return(c=(o=n.verifyMessageData)==null?void 0:o.call(n,a))!=null?c:a}).then(a=>{var o;return(o=n==null?void 0:n.logger)==null||o.debug(`[messaging] onMessage {id=${x.id}} ─ᐅ`,{res:a}),{res:a}}).catch(a=>{var o;return(o=n==null?void 0:n.logger)==null||o.debug(`[messaging] onMessage {id=${x.id}} ─ᐅ`,{err:a}),{err:ke(a)}})})),e[u]!=null){const x=Error(`[messaging] In this JS context, only one listener can be setup for ${u}`);throw(h=n.logger)==null||h.error(x),x}return e[u]=w,(A=n.logger)==null||A.log(`[messaging] Added listener for ${u}`),()=>{delete e[u],r()}},removeAllListeners(){Object.keys(e).forEach(u=>{delete e[u]}),r()}}}function qe(n){return n&&n.__esModule&&Object.prototype.hasOwnProperty.call(n,"default")?n.default:n}var U={exports:{}},Ne=U.exports,me;function Be(){return me||(me=1,function(n,t){(function(e,r){r(n)})(typeof globalThis<"u"?globalThis:typeof self<"u"?self:Ne,function(e){var r,s;if(!((s=(r=globalThis.chrome)==null?void 0:r.runtime)!=null&&s.id))throw new Error("This script should only be loaded in a browser extension.");if(typeof globalThis.browser>"u"||Object.getPrototypeOf(globalThis.browser)!==Object.prototype){const i="The message port closed before a response was received.",u=w=>{const v={alarms:{clear:{minArgs:0,maxArgs:1},clearAll:{minArgs:0,maxArgs:0},get:{minArgs:0,maxArgs:1},getAll:{minArgs:0,maxArgs:0}},bookmarks:{create:{minArgs:1,maxArgs:1},get:{minArgs:1,maxArgs:1},getChildren:{minArgs:1,maxArgs:1},getRecent:{minArgs:1,maxArgs:1},getSubTree:{minArgs:1,maxArgs:1},getTree:{minArgs:0,maxArgs:0},move:{minArgs:2,maxArgs:2},remove:{minArgs:1,maxArgs:1},removeTree:{minArgs:1,maxArgs:1},search:{minArgs:1,maxArgs:1},update:{minArgs:2,maxArgs:2}},browserAction:{disable:{minArgs:0,maxArgs:1,fallbackToNoCallback:!0},enable:{minArgs:0,maxArgs:1,fallbackToNoCallback:!0},getBadgeBackgroundColor:{minArgs:1,maxArgs:1},getBadgeText:{minArgs:1,maxArgs:1},getPopup:{minArgs:1,maxArgs:1},getTitle:{minArgs:1,maxArgs:1},openPopup:{minArgs:0,maxArgs:0},setBadgeBackgroundColor:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setBadgeText:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setIcon:{minArgs:1,maxArgs:1},setPopup:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setTitle:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0}},browsingData:{remove:{minArgs:2,maxArgs:2},removeCache:{minArgs:1,maxArgs:1},removeCookies:{minArgs:1,maxArgs:1},removeDownloads:{minArgs:1,maxArgs:1},removeFormData:{minArgs:1,maxArgs:1},removeHistory:{minArgs:1,maxArgs:1},removeLocalStorage:{minArgs:1,maxArgs:1},removePasswords:{minArgs:1,maxArgs:1},removePluginData:{minArgs:1,maxArgs:1},settings:{minArgs:0,maxArgs:0}},commands:{getAll:{minArgs:0,maxArgs:0}},contextMenus:{remove:{minArgs:1,maxArgs:1},removeAll:{minArgs:0,maxArgs:0},update:{minArgs:2,maxArgs:2}},cookies:{get:{minArgs:1,maxArgs:1},getAll:{minArgs:1,maxArgs:1},getAllCookieStores:{minArgs:0,maxArgs:0},remove:{minArgs:1,maxArgs:1},set:{minArgs:1,maxArgs:1}},devtools:{inspectedWindow:{eval:{minArgs:1,maxArgs:2,singleCallbackArg:!1}},panels:{create:{minArgs:3,maxArgs:3,singleCallbackArg:!0},elements:{createSidebarPane:{minArgs:1,maxArgs:1}}}},downloads:{cancel:{minArgs:1,maxArgs:1},download:{minArgs:1,maxArgs:1},erase:{minArgs:1,maxArgs:1},getFileIcon:{minArgs:1,maxArgs:2},open:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},pause:{minArgs:1,maxArgs:1},removeFile:{minArgs:1,maxArgs:1},resume:{minArgs:1,maxArgs:1},search:{minArgs:1,maxArgs:1},show:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0}},extension:{isAllowedFileSchemeAccess:{minArgs:0,maxArgs:0},isAllowedIncognitoAccess:{minArgs:0,maxArgs:0}},history:{addUrl:{minArgs:1,maxArgs:1},deleteAll:{minArgs:0,maxArgs:0},deleteRange:{minArgs:1,maxArgs:1},deleteUrl:{minArgs:1,maxArgs:1},getVisits:{minArgs:1,maxArgs:1},search:{minArgs:1,maxArgs:1}},i18n:{detectLanguage:{minArgs:1,maxArgs:1},getAcceptLanguages:{minArgs:0,maxArgs:0}},identity:{launchWebAuthFlow:{minArgs:1,maxArgs:1}},idle:{queryState:{minArgs:1,maxArgs:1}},management:{get:{minArgs:1,maxArgs:1},getAll:{minArgs:0,maxArgs:0},getSelf:{minArgs:0,maxArgs:0},setEnabled:{minArgs:2,maxArgs:2},uninstallSelf:{minArgs:0,maxArgs:1}},notifications:{clear:{minArgs:1,maxArgs:1},create:{minArgs:1,maxArgs:2},getAll:{minArgs:0,maxArgs:0},getPermissionLevel:{minArgs:0,maxArgs:0},update:{minArgs:2,maxArgs:2}},pageAction:{getPopup:{minArgs:1,maxArgs:1},getTitle:{minArgs:1,maxArgs:1},hide:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setIcon:{minArgs:1,maxArgs:1},setPopup:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setTitle:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},show:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0}},permissions:{contains:{minArgs:1,maxArgs:1},getAll:{minArgs:0,maxArgs:0},remove:{minArgs:1,maxArgs:1},request:{minArgs:1,maxArgs:1}},runtime:{getBackgroundPage:{minArgs:0,maxArgs:0},getPlatformInfo:{minArgs:0,maxArgs:0},openOptionsPage:{minArgs:0,maxArgs:0},requestUpdateCheck:{minArgs:0,maxArgs:0},sendMessage:{minArgs:1,maxArgs:3},sendNativeMessage:{minArgs:2,maxArgs:2},setUninstallURL:{minArgs:1,maxArgs:1}},sessions:{getDevices:{minArgs:0,maxArgs:1},getRecentlyClosed:{minArgs:0,maxArgs:1},restore:{minArgs:0,maxArgs:1}},storage:{local:{clear:{minArgs:0,maxArgs:0},get:{minArgs:0,maxArgs:1},getBytesInUse:{minArgs:0,maxArgs:1},remove:{minArgs:1,maxArgs:1},set:{minArgs:1,maxArgs:1}},managed:{get:{minArgs:0,maxArgs:1},getBytesInUse:{minArgs:0,maxArgs:1}},sync:{clear:{minArgs:0,maxArgs:0},get:{minArgs:0,maxArgs:1},getBytesInUse:{minArgs:0,maxArgs:1},remove:{minArgs:1,maxArgs:1},set:{minArgs:1,maxArgs:1}}},tabs:{captureVisibleTab:{minArgs:0,maxArgs:2},create:{minArgs:1,maxArgs:1},detectLanguage:{minArgs:0,maxArgs:1},discard:{minArgs:0,maxArgs:1},duplicate:{minArgs:1,maxArgs:1},executeScript:{minArgs:1,maxArgs:2},get:{minArgs:1,maxArgs:1},getCurrent:{minArgs:0,maxArgs:0},getZoom:{minArgs:0,maxArgs:1},getZoomSettings:{minArgs:0,maxArgs:1},goBack:{minArgs:0,maxArgs:1},goForward:{minArgs:0,maxArgs:1},highlight:{minArgs:1,maxArgs:1},insertCSS:{minArgs:1,maxArgs:2},move:{minArgs:2,maxArgs:2},query:{minArgs:1,maxArgs:1},reload:{minArgs:0,maxArgs:2},remove:{minArgs:1,maxArgs:1},removeCSS:{minArgs:1,maxArgs:2},sendMessage:{minArgs:2,maxArgs:3},setZoom:{minArgs:1,maxArgs:2},setZoomSettings:{minArgs:1,maxArgs:2},update:{minArgs:1,maxArgs:2}},topSites:{get:{minArgs:0,maxArgs:0}},webNavigation:{getAllFrames:{minArgs:1,maxArgs:1},getFrame:{minArgs:1,maxArgs:1}},webRequest:{handlerBehaviorChanged:{minArgs:0,maxArgs:0}},windows:{create:{minArgs:0,maxArgs:1},get:{minArgs:1,maxArgs:2},getAll:{minArgs:0,maxArgs:1},getCurrent:{minArgs:0,maxArgs:1},getLastFocused:{minArgs:0,maxArgs:1},remove:{minArgs:1,maxArgs:1},update:{minArgs:2,maxArgs:2}}};if(Object.keys(v).length===0)throw new Error("api-metadata.json has not been included in browser-polyfill");class h extends WeakMap{constructor(m,d=void 0){super(d),this.createItem=m}get(m){return this.has(m)||this.set(m,this.createItem(m)),super.get(m)}}const A=g=>g&&typeof g=="object"&&typeof g.then=="function",x=(g,m)=>(...d)=>{w.runtime.lastError?g.reject(new Error(w.runtime.lastError.message)):m.singleCallbackArg||d.length<=1&&m.singleCallbackArg!==!1?g.resolve(d[0]):g.resolve(d)},I=g=>g==1?"argument":"arguments",K=(g,m)=>function(b,...P){if(P.length<m.minArgs)throw new Error(`Expected at least ${m.minArgs} ${I(m.minArgs)} for ${g}(), got ${P.length}`);if(P.length>m.maxArgs)throw new Error(`Expected at most ${m.maxArgs} ${I(m.maxArgs)} for ${g}(), got ${P.length}`);return new Promise((T,M)=>{if(m.fallbackToNoCallback)try{b[g](...P,x({resolve:T,reject:M},m))}catch(y){console.warn(`${g} API method doesn't seem to support the callback parameter, falling back to call it without a callback: `,y),b[g](...P),m.fallbackToNoCallback=!1,m.noCallback=!0,T()}else m.noCallback?(b[g](...P),T()):b[g](...P,x({resolve:T,reject:M},m))})},O=(g,m,d)=>new Proxy(m,{apply(b,P,T){return d.call(P,g,...T)}});let l=Function.call.bind(Object.prototype.hasOwnProperty);const a=(g,m={},d={})=>{let b=Object.create(null),P={has(M,y){return y in g||y in b},get(M,y,k){if(y in b)return b[y];if(!(y in g))return;let _=g[y];if(typeof _=="function")if(typeof m[y]=="function")_=O(g,g[y],m[y]);else if(l(d,y)){let R=K(y,d[y]);_=O(g,g[y],R)}else _=_.bind(g);else if(typeof _=="object"&&_!==null&&(l(m,y)||l(d,y)))_=a(_,m[y],d[y]);else if(l(d,"*"))_=a(_,m[y],d["*"]);else return Object.defineProperty(b,y,{configurable:!0,enumerable:!0,get(){return g[y]},set(R){g[y]=R}}),_;return b[y]=_,_},set(M,y,k,_){return y in b?b[y]=k:g[y]=k,!0},defineProperty(M,y,k){return Reflect.defineProperty(b,y,k)},deleteProperty(M,y){return Reflect.deleteProperty(b,y)}},T=Object.create(g);return new Proxy(T,P)},o=g=>({addListener(m,d,...b){m.addListener(g.get(d),...b)},hasListener(m,d){return m.hasListener(g.get(d))},removeListener(m,d){m.removeListener(g.get(d))}}),c=new h(g=>typeof g!="function"?g:function(d){const b=a(d,{},{getContent:{minArgs:0,maxArgs:0}});g(b)}),f=new h(g=>typeof g!="function"?g:function(d,b,P){let T=!1,M,y=new Promise(V=>{M=function(F){T=!0,V(F)}}),k;try{k=g(d,b,M)}catch(V){k=Promise.reject(V)}const _=k!==!0&&A(k);if(k!==!0&&!_&&!T)return!1;const R=V=>{V.then(F=>{P(F)},F=>{let ne;F&&(F instanceof Error||typeof F.message=="string")?ne=F.message:ne="An unexpected error occurred",P({__mozWebExtensionPolyfillReject__:!0,message:ne})}).catch(F=>{console.error("Failed to send onMessage rejected reply",F)})};return R(_?k:y),!0}),p=({reject:g,resolve:m},d)=>{w.runtime.lastError?w.runtime.lastError.message===i?m():g(new Error(w.runtime.lastError.message)):d&&d.__mozWebExtensionPolyfillReject__?g(new Error(d.message)):m(d)},C=(g,m,d,...b)=>{if(b.length<m.minArgs)throw new Error(`Expected at least ${m.minArgs} ${I(m.minArgs)} for ${g}(), got ${b.length}`);if(b.length>m.maxArgs)throw new Error(`Expected at most ${m.maxArgs} ${I(m.maxArgs)} for ${g}(), got ${b.length}`);return new Promise((P,T)=>{const M=p.bind(null,{resolve:P,reject:T});b.push(M),d.sendMessage(...b)})},E={devtools:{network:{onRequestFinished:o(c)}},runtime:{onMessage:o(f),onMessageExternal:o(f),sendMessage:C.bind(null,"sendMessage",{minArgs:1,maxArgs:3})},tabs:{sendMessage:C.bind(null,"sendMessage",{minArgs:2,maxArgs:3})}},L={clear:{minArgs:1,maxArgs:1},get:{minArgs:1,maxArgs:1},set:{minArgs:1,maxArgs:1}};return v.privacy={network:{"*":L},services:{"*":L},websites:{"*":L}},a(w,E,v)};e.exports=u(chrome)}else e.exports=globalThis.browser})}(U)),U.exports}var Ve=Be();const H=qe(Ve);function De(n){return je(ge(ue({},n),{sendMessage(t,e){if(e==null)return H.runtime.sendMessage(t);const r=typeof e=="number"?{tabId:e}:e;return H.tabs.sendMessage(r.tabId,t,r.frameId!=null?{frameId:r.frameId}:void 0)},addRootListener(t){const e=(r,s)=>t(typeof r=="object"?ge(ue({},r),{sender:s}):r);return H.runtime.onMessage.addListener(e),()=>H.runtime.onMessage.removeListener(e)}}))}const{sendMessage:et,onMessage:S}=De();function de(){var n;return Math.floor(((n=window.visualViewport)==null?void 0:n.height)||window.innerHeight)}const xProfileMain = "body > div:nth-of-type(1) > div > div:nth-of-type(2) > main > div";
const xFollowerTabs = new Set(["followers", "following", "followings", "verified_followers"]);
const xProfileSelectors = {
  timeline: {
    cover: `${xProfileMain} > a > div > img`,
    start: `${xProfileMain} > div:nth-of-type(2)`,
    items: `${xProfileMain} > section > div:nth-of-type(2) > ul > li:nth-of-type(n)`
  },
  followers: {
    start: `${xProfileMain} > div > div:nth-of-type(2)`,
    items: `${xProfileMain} > div > section > div:nth-of-type(2) > ul > li:nth-of-type(n)`
  }
};
class We{constructor(t,e){j(this,"document");j(this,"location");this.document=t,this.location=e}post(){const t=this.document.querySelector("main[role='main'] div[aria-label='Home timeline']");if(t)return t;throw new Error("Twitter post not found.")}postStickyHeader(){const e=this.post().children[0];if(e)return e;throw new Error("Twitter post header not found.")}postProper(){const e=this.post().querySelector("article[role='article']");if(e)return e;throw new Error("Twitter post not found.")}sortCommentsButton(){const r=[...this.post().querySelectorAll("button[role='button'][aria-haspopup='menu']")].find(s=>{var u;const i=((u=s.textContent)==null?void 0:u.toLowerCase())||"";return["relevant","recent","likes"].includes(i)});return r||null}postCommentsContainer(){var r;const e=(r=this.post().querySelector("div[aria-label='Timeline: Conversation']"))==null?void 0:r.children[0];if(e)return e;throw new Error("Twitter post comments not found.")}postComments(){return this.postCommentsContainer().children}lastComment(){const e=[...this.postComments()].findLast(r=>r.textContent!==""&&r.offsetHeight>0);return e||null}showSpamCommentsButton(){const r=[...this.postCommentsContainer().querySelectorAll("button[role='button']")].find(s=>{var i;return((i=s.textContent)==null?void 0:i.toLowerCase())==="show probable spam"});return r||null}translateButton(t){if(!t)return null;const e=t.querySelector("button[role='button'][aria-label='Show translation']");return e||null}backTranslateButton(t){if(!t)return null;const e=t.querySelector("button[role='button'][aria-label='Show original']");return e||null}isLoading(t){return!!t.querySelector("div[role='progressbar'] svg")}initializePostCapture(){this.postStickyHeader().style.setProperty("position","static")}translatePost(t){const e=this.post(),r=t?this.translateButton(e):this.backTranslateButton(e);return r==null||r.click(),!!r}loadPostReplies(t){const e=this.post();if(this.isLoading(e))return!0;if(window.scrollY>t)return!1;const r=this.findButtonWithText(e,"show replies");return this.clickAndScrollToButton(r),!!r}loadPostComments(t){const e=this.post();if(this.isLoading(e))return!0;const r=this.showSpamCommentsButton();if(r==null||r.click(),window.scrollY>t)return!1;const{bottom:s}=e.getBoundingClientRect();return Math.abs(window.innerHeight-s)<=1?!1:(window.scrollTo(0,window.scrollY+s),!0)}getPostDimensions(t){const e=this.post(),r=this.postProper(),s=this.sortCommentsButton(),i=this.lastComment();let u=0;const{top:w,left:v,width:h,bottom:A}=e.getBoundingClientRect();return!t&&s?u=s.getBoundingClientRect().top:t?i&&(u=i.getBoundingClientRect().bottom):u=r.getBoundingClientRect().bottom,{top:w>0?w:0,left:v,width:h,height:de(),totalHeight:window.scrollY+A,scrollY:window.scrollY,cutoffY:u?window.scrollY+u:0}}processPostComments(){const t=this.postComments();let e=!1,r=!1;return[...t].forEach(s=>{const i=s;this.startOfFillerContent(i)?e=!0:this.endOfFillerContent(i)&&(e=!1),e?(this.hideElement(i),r=!0):(this.expandContent(i)&&(r=!0),this.pauseVideo(i)&&(r=!0))}),r}terminatePostCapture(){this.postStickyHeader().style.setProperty("position","sticky")}findLinkWithText(t,e){const s=[...t.querySelectorAll("a[role='link']")].find(i=>{var u;return((u=i.textContent)==null?void 0:u.toLowerCase())===e});return s||null}findButtonWithText(t,e){const s=[...t.querySelectorAll("button[role='button']")].find(i=>{var u;return((u=i.textContent)==null?void 0:u.toLowerCase())===e});return s||null}clickAndScrollToButton(t){t&&(t.scrollIntoView({block:"center"}),t.click())}getDataFromUrl(){var i;const t=this.location.pathname.split("/").filter(u=>!!u),e=t[0],r=(i=/\/status\/(\w{12})/.exec(window.location.pathname))==null?void 0:i[1],s=t[1]==="with_replies"?"replies":t[1];return{username:e,postId:r,tab:s}}isProfilePath() {
  const [, handle, subsection] = this.location.pathname.split("/");
  const subpages = ["with_replies", "media", "likes", "highlights", "articles", ...xFollowerTabs];
  const reserved = ["home", "explore", "search", "notifications", "messages", "settings", "compose", "login", "logout", "signup", "i"];
  return /^[a-z0-9_]{1,15}$/i.test(handle || "") &&
    !reserved.includes(handle.toLowerCase()) &&
    (!subsection || subpages.includes(subsection));
}
profileSelectorLayout() {
  if (!this.isProfilePath()) return null;
  const tab = this.location.pathname.split("/")[2];
  const followerList = xFollowerTabs.has(tab);
  const selectors = followerList ? xProfileSelectors.followers : xProfileSelectors.timeline;
  const rows = Array.from(this.document.querySelectorAll(selectors.items))
    .filter(item => item.getClientRects().length);
  if (!rows.length) return null;
  const covers = selectors.cover ? Array.from(this.document.querySelectorAll(selectors.cover)) : [];
  const starts = this.document.querySelectorAll(selectors.start);
  for (const start of [...covers, ...starts]) {
    const bounds = start.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) continue;
    const column = followerList ? start.parentElement : start.closest(xProfileMain);
    const items = rows.filter(item => column?.contains(item));
    if (items.length) return {start, column, items, selectors, followerList};
  }
  return null;
}
getProfileCaptureRegion() {
  const layout = this.profileSelectorLayout();
  if (!layout) return null;
  this.explicitProfileLayout = layout;
  const anchor = layout.start.getBoundingClientRect();
  const list = layout.items[0].parentElement.getBoundingClientRect();
  const left = Math.max(0, Math.floor(Math.min(anchor.left, list.left)));
  const right = Math.min(this.document.documentElement.clientWidth, Math.ceil(Math.max(anchor.right, list.right)));
  const rows = layout.items.map(item => {
    const rect = item.getBoundingClientRect();
    return {top: Math.round(rect.top + window.scrollY), bottom: Math.round(rect.bottom + window.scrollY)};
  });
  const start = Math.max(0, Math.round(anchor.top + window.scrollY));
  const end = rows.at(-1).bottom;
  const navbar = layout.followerList
    ? layout.column.querySelector("[data-testid='TopNavBar']") ||
      layout.column.parentElement?.querySelector(":scope > [data-testid='TopNavBar']")
    : null;
  const firstTop = navbar?.getBoundingClientRect().top;
  const firstStart = Number.isFinite(firstTop) ? Math.min(start, Math.max(0, Math.round(firstTop + window.scrollY))) : start;
  return right > left && end > start ? {start, firstStart, end, left, width: right - left, rows} : null;
}
profileRowsForViewport() {
  const pinned = this.explicitProfileLayout;
  if (!pinned) return this.profileSelectorLayout();
  const items = Array.from(this.document.querySelectorAll(pinned.selectors.items))
    .filter(item => item.getClientRects().length);
  const column = pinned.column.isConnected
    ? pinned.column
    : this.profileSelectorLayout()?.column || items[0]?.closest("section")?.parentElement;
  return {column, items: items.filter(item => column?.contains(item))};
}
rememberProfileStyle(element, property, value) {
  if (element.style.getPropertyValue(property) === value &&
      element.style.getPropertyPriority(property) === "important") return;
  this.profileStyles ??= [];
  if (!this.profileStyles.some(saved => saved.element === element && saved.property === property)) {
    this.profileStyles.push({
      element, property,
      previous: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property)
    });
  }
  element.style.setProperty(property, value, "important");
}
hideNoFollowContext(profile, firstItem) {
  const firstRow = firstItem || profile.querySelector("[data-testid='cellInnerDiv'], article");
  const matchesLine = element => /^not followed by anyone you['’]re following[.!]?$/i
    .test(element.textContent.trim().replace(/\s+/g, " "));
  for (const element of profile.querySelectorAll("div, p, span")) {
    if (element.closest("article, li, [data-testid='cellInnerDiv']")) continue;
    if (firstRow && !(element.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
    if (matchesLine(element) && !Array.from(element.children).some(matchesLine)) {
      this.rememberProfileStyle(element, "visibility", "hidden");
    }
  }
}
hideProfileViewportChrome(column, items, preserveHeader, listHeader) {
  if (!column) return;
  const bounds = column.getBoundingClientRect();
  const header = column.querySelector("[data-testid='TopNavBar']");
  const layers = this.document.querySelectorAll("#layers *, [data-testid='layers'] *, [data-testid='BottomBar'], [data-testid='TopNavBar']");
  for (const element of new Set([...column.querySelectorAll("*"), ...layers])) {
    const box = element.getBoundingClientRect();
    const navbar = element.matches("[data-testid='TopNavBar']");
    if (box.width <= 0 || box.height <= 0 || box.right <= bounds.left || box.left >= bounds.right ||
        (!navbar && (box.bottom <= 0 || box.top >= window.innerHeight))) continue;
    const {position} = window.getComputedStyle(element);
    if (!navbar && position !== "sticky" && position !== "fixed") continue;
    const wrapsHeader = [header, listHeader].some(part => part && (element.contains(part) || part.contains(element)));
    if (preserveHeader && (navbar || wrapsHeader || (box.top <= 2 && box.bottom > 2))) continue;
    if (items.some(item => item.contains(element) || element.contains(item))) continue;
    this.rememberProfileStyle(element, "visibility", "hidden");
  }
}
profileOmittedRows(items) {
  const omitted = new Set();
  if (xFollowerTabs.has(this.location.pathname.split("/")[2])) return omitted;
  const recommendation = /^(who to follow|discover more|you might like|suggested accounts|probable spam)$/i;
  let inRecommendations = false;
  for (const row of items) {
    const headings = row.querySelectorAll("h1, h2, h3, [role='heading']");
    const hasHeading = Array.from(headings).some(heading =>
      !heading.closest("article") && recommendation.test(heading.textContent.trim())
    );
    const account = row.querySelector("[data-testid='UserCell']");
    const more = this.endOfFillerContent(row) || row.querySelector("a[href*='/i/connect_people']");
    const post = row.querySelector("article, a[href*='/status/']");
    const spacer = row.offsetHeight === 9 && !row.textContent.trim();
    if (post && !hasHeading) {
      inRecommendations = false;
      continue;
    }
    if (spacer || account || hasHeading ||
        row.querySelector("a[href*='/i/connect_people']") || (inRecommendations && more)) omitted.add(row);
    if (hasHeading) inRecommendations = true;
    else if (more || (!account && row.textContent.trim())) inRecommendations = false;
  }
  return omitted;
}
removeFollowerTabActiveState(listHeader) {
  for (const tab of listHeader.querySelectorAll(":scope > div > div > a[role='tab'][data-active]")) {
    this.profileTabActiveStates ??= new Map();
    if (!this.profileTabActiveStates.has(tab)) {
      this.profileTabActiveStates.set(tab, {
        value: tab.getAttribute("data-active"),
        selected: tab.getAttribute("aria-selected"),
        current: tab.getAttribute("aria-current")
      });
    }
    tab.removeAttribute("data-active");
  }
}
prepareProfileChrome({firstFrame = false} = {}, layout = this.profileRowsForViewport()) {
  const column = layout?.column || this.findProfile();
  if (!column) return;
  const items = layout?.items || this.profilePosts();
  const followerList = xFollowerTabs.has(this.location.pathname.split("/")[2]);
  const preserveHeader = followerList && firstFrame;
  const listHeader = followerList ? column.querySelector(":scope > div:nth-of-type(2)") : null;
  if (followerList) {
    if (!preserveHeader && listHeader?.matches(xProfileSelectors.followers.start) &&
        !Array.from(items).some(item => listHeader.contains(item))) {
      this.rememberProfileStyle(listHeader, "visibility", "hidden");
      this.removeFollowerTabActiveState(listHeader);
    }
  } else {
    this.hideNoFollowContext(column, items[0]);
  }
  this.hideProfileViewportChrome(column, Array.from(items), preserveHeader, listHeader);
}
async prepareProfileCaptureViewport(options) {
  let layout = this.profileRowsForViewport();
  if (!layout?.column) return {rows: [], loading: true};
  let omitted = this.profileOmittedRows(layout.items);
  let expanded = false;
  this.expandedProfileRows ??= new WeakSet();
  const followerList = xFollowerTabs.has(this.location.pathname.split("/")[2]);
  for (const row of followerList ? [] : layout.items) {
    const rect = row.getBoundingClientRect();
    if (omitted.has(row) || rect.bottom <= 0 || rect.top >= window.innerHeight) continue;
    if (!this.expandedProfileRows.has(row) && this.expandContent(row)) {
      this.expandedProfileRows.add(row);
      expanded = true;
    }
    this.pauseVideo(row);
  }
  if (expanded) {
    await new Promise(resolve => setTimeout(resolve, 150));
    layout = this.profileRowsForViewport();
    if (!layout?.column) return {rows: [], loading: true};
    omitted = this.profileOmittedRows(layout.items);
  }
  this.prepareProfileChrome(options, layout);
  await new Promise(resolve => setTimeout(resolve, 32));
  return {
    loading: this.isLoading(layout.column),
    rows: layout.items.map(item => {
      const rect = item.getBoundingClientRect();
      return {
        top: Math.round(rect.top + window.scrollY),
        bottom: Math.round(rect.bottom + window.scrollY),
        omit: omitted.has(item)
      };
    }).filter(row => row.bottom > row.top)
  };
}
findProfile() {
  if (!this.isProfilePath()) return null;
  const layout = this.profileSelectorLayout();
  if (layout) return layout.column;
  const main = this.document.querySelector("main[role='main'], main, [role='main']");
  if (!main) return null;

  const primary = main.querySelector("[data-testid='primaryColumn']");
  const legacy = main.querySelector("div[aria-label='Home timeline']");
  const column = primary || legacy || main;
  const marker = "[data-testid='UserName'], [data-testid='UserDescription'], [data-testid='UserProfileHeader_Items'], [data-testid='UserProfileHeader']";
  if (column.querySelector(marker)) return column;

  // Profile tabs use URLs tied to the current handle, independent of the UI language.
  const [, handle] = this.location.pathname.split("/");
  const profilePath = `/${handle.toLowerCase()}/`;
  const profileLinks = [
    "with_replies", "media", "likes", "highlights", "articles",
    "followers", "following", "verified_followers", "photo", "header_photo"
  ];
  const hasProfileLink = Array.from(column.querySelectorAll(
    "a[role='tab'][href], a[href*='/following'], a[href*='/followers'], a[href*='/photo'], a[href*='/header_photo']"
  )).some(link => {
    try {
      const url = new URL(link.getAttribute("href"), this.location.href);
      if (url.origin !== this.location.origin) return false;
      const path = url.pathname.toLowerCase().replace(/\/$/, "");
      return path.startsWith(profilePath) && profileLinks.includes(path.slice(profilePath.length));
    } catch {
      return false;
    }
  });
  return hasProfileLink ? column : legacy;
}

profilePageError() {
  const path = this.location.pathname;
  if (path === "/login" || path.startsWith("/i/flow/login") ||
      this.document.querySelector("input[autocomplete='username']")) {
    return "X is showing its sign-in page. Open the profile in a signed-in tab.";
  }
  if (!this.isProfilePath()) return "Open the user's profile URL for a timeline screenshot.";
  const main = this.document.querySelector("[data-testid='primaryColumn'], main, [role='main']");
  if (/account suspended|this account doesn.t exist|this profile (is unavailable|doesn.t exist)/i.test(main?.textContent || "")) {
    return "X reports that this profile is unavailable.";
  }
  return "";
}

profile() {
  const profile = this.findProfile();
  if (profile) return profile;
  throw new Error(this.profilePageError() ||
    "The X profile layout could not be identified. Choose Others → Page: First to capture the visible page.");
}
profileDetails() {
  const profile = this.profile();
  const {tab} = this.getDataFromUrl();
  if (/followers|following/.test(tab)) return null;
  const bio = profile.querySelector("[data-testid='UserDescription']");
  if (bio) return bio.parentElement;
  const legacy = profile.matches("[aria-label='Home timeline']") ? profile : profile.querySelector("div[aria-label='Home timeline']");
  return legacy?.children[2]?.children[0]?.children[0]?.children[0] || null;
}
profilePosts() {
  const layout = this.profileSelectorLayout();
  if (layout) return layout.items;
  const profile = this.profile();
  const timeline = profile.querySelector("div[aria-label^='Timeline:'], div[aria-label*='Timeline']");
  const cells = (timeline || profile).querySelectorAll("[data-testid='cellInnerDiv']");
  return cells.length ? Array.from(cells) : timeline?.firstElementChild?.children || [];
}
lastPost(){const t=this.profilePosts(),e=[...t].filter(s=>s.textContent!==""&&s.offsetHeight>0),r=e[e.length-1]||t[t.length-1];return r||null}landingPageLastPost(){const t=this.profilePosts(),e=[...t].filter(s=>{var i;return((i=s.textContent)==null?void 0:i.toLowerCase())==="show more replies"?!1:s.textContent!==""&&s.offsetHeight>0}),r=e[2]||e[e.length-1]||t[t.length-1];return r||null}async initializeProfileCapture(resetScroll) {
  if (this.isProfilePath()) {
    for (let attempt = 0; attempt < 24 && !this.findProfile() && !this.profilePageError(); attempt++) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  this.explicitProfileLayout = null;
  this.expandedProfileRows = null;
  this.profile();
  this.profileStyles = [];
  if (!xFollowerTabs.has(this.location.pathname.split("/")[2])) {
    if (resetScroll) window.scrollTo(0, 0);
    this.translateButton(this.profileDetails())?.click();
  }
}
getLandingPageCutoff(){const t=this.profile(),e=this.landingPageLastPost();return window.scrollY+(e||t).getBoundingClientRect().bottom}loadProfile(t){const e=this.profile();if(this.isLoading(e))return!0;const{scrollHeight:r}=this.document.body,{scrollY:s,innerHeight:i}=window;return Math.abs(r-s-i)<=1||s>t?!1:(window.scrollTo(0,r),!0)}getProfileDimensions(){const t=this.profile(),e=this.lastPost(),{top:r,left:s,width:i,bottom:u}=t.getBoundingClientRect(),{bottom:w}=(e==null?void 0:e.getBoundingClientRect())||{};return{top:Math.max(Math.floor(r),0),left:s,width:i,height:de(),totalHeight:window.scrollY+(w||u),scrollY:window.scrollY}}processProfilePosts(){const t=this.profilePosts();let e=!1,r=!1;return[...t].forEach(s=>{this.startOfFillerContent(s)?e=!0:this.endOfFillerContent(s)&&(this.hideElement(s),e=!1,r=!0),s.offsetHeight===9&&this.hideElement(s),e?(this.hideElement(s),r=!0):(this.expandContent(s)&&(r=!0),this.pauseVideo(s)&&(r=!0))}),r}getProfileCutoff(t){const e=this.profilePosts();let r=0;return[...e].findLast(s=>(r=s.getBoundingClientRect().top,window.scrollY+r<=t)),window.scrollTo(0,window.scrollY+r),window.scrollY}terminateProfileCapture() {
  for (const {element, property, previous, priority} of this.profileStyles || []) {
    if (previous) element.style.setProperty(property, previous, priority);
    else element.style.removeProperty(property);
  }
  for (const [tab, saved] of this.profileTabActiveStates || []) {
    if (tab.isConnected && !tab.hasAttribute("data-active") &&
        tab.getAttribute("aria-selected") === saved.selected &&
        tab.getAttribute("aria-current") === saved.current) {
      tab.setAttribute("data-active", saved.value);
    }
  }
  this.profileTabActiveStates?.clear();
  this.profileStyles = [];
  this.explicitProfileLayout = null;
  this.expandedProfileRows = null;
}
startOfFillerContent(t){var s;const e=t.querySelector("h2[role='heading']"),r=(s=e==null?void 0:e.textContent)==null?void 0:s.toLowerCase();return r==="discover more"||r==="who to follow"}endOfFillerContent(t){var i;const e=t.querySelector("h2[role='heading']"),r=(i=e==null?void 0:e.textContent)==null?void 0:i.toLowerCase(),s=this.findLinkWithText(t,"show more");return r==="probable spam"||!!s}hideElement(t){t.style.setProperty("display","none")}expandContent(t){const e=this.findButtonWithText(t,"show more");return e==null||e.click(),!!e}pauseVideo(t){const e=t.querySelector("video");return e&&!e.paused?(e.pause(),!0):!1}}const Ue={matches:["*://*.x.com/*","*://*.twitter.com/*"],main(n){const t=new We(document,window.location),e=async s=>{const i=new Date;await ie.setItem("local:log",`${i.toLocaleTimeString()} ${s}`)},r=async()=>await ie.getItem("local:abort");S("initializeTwitterPostCapture",async()=>{if(!await r())return await e("Preparing capture"),t.initializePostCapture()}),S("translateTwitterPost",async s=>{if(await r())return!1;const i=s.data;return i&&await e("Translating post"),t.translatePost(i)}),S("loadTwitterPostReplies",async s=>{if(await r())return!1;const i=t.loadPostReplies(s.data);return i&&await e("Loading replies"),i}),S("loadTwitterPostComments",async s=>{if(await r())return!1;const i=t.loadPostComments(s.data);return i&&await e("Loading comments"),i}),S("getTwitterPostDimensions",async s=>{if(!await r())return await e("Capturing post"),t.getPostDimensions(s.data)}),S("processTwitterPostComments",async()=>t.processPostComments()),S("terminateTwitterPostCapture",async()=>(await e("Done capturing"),t.terminatePostCapture())),S("getDataFromTwitterUrl",()=>t.getDataFromUrl()),S("initializeTwitterProfileCapture",async s=>{if(!await r())return await e("Preparing capture"),t.initializeProfileCapture(s.data)}),S("getTwitterLandingPageCutoff",async()=>t.getLandingPageCutoff()),S("loadTwitterProfile",async s=>{if(await r())return!1;const i=t.loadProfile(s.data);return i&&await e("Loading profile"),i}),S("getTwitterProfileDimensions",async()=>{if(!await r())return await e("Capturing profile"),t.getProfileDimensions()}),S("processTwitterProfilePosts",async()=>t.processProfilePosts()),S("getTwitterProfileCutoff",async s=>t.getProfileCutoff(s.data)),S("getTwitterProfileCaptureRegion", async () => t.getProfileCaptureRegion()),S("prepareTwitterProfileViewport", async message => t.prepareProfileCaptureViewport(message.data)),
S("prepareTwitterProfileChrome", async message => t.prepareProfileChrome(message.data)),S("terminateTwitterProfileCapture",async()=>(await e("Done capturing"),t.terminateProfileCapture()))}},Y=((we=(pe=globalThis.browser)==null?void 0:pe.runtime)==null?void 0:we.id)==null?globalThis.chrome:globalThis.browser;function z(n,...t){}const He={debug:(...n)=>z(console.debug,...n),log:(...n)=>z(console.log,...n),warn:(...n)=>z(console.warn,...n),error:(...n)=>z(console.error,...n)},G=class G extends Event{constructor(t,e){super(G.EVENT_NAME,{}),this.newUrl=t,this.oldUrl=e}};j(G,"EVENT_NAME",te("wxt:locationchange"));let ee=G;function te(n){var t;return`${(t=Y==null?void 0:Y.runtime)==null?void 0:t.id}:twitter:${n}`}function Ye(n){let t,e;return{run(){t==null&&(e=new URL(location.href),t=n.setInterval(()=>{let r=new URL(location.href);r.href!==e.href&&(window.dispatchEvent(new ee(r,e)),e=r)},1e3))}}}const B=class B{constructor(t,e){j(this,"isTopFrame",window.self===window.top);j(this,"abortController");j(this,"locationWatcher",Ye(this));this.contentScriptName=t,this.options=e,this.abortController=new AbortController,this.isTopFrame?(this.listenForNewerScripts({ignoreFirstEvent:!0}),this.stopOldScripts()):this.listenForNewerScripts()}get signal(){return this.abortController.signal}abort(t){return this.abortController.abort(t)}get isInvalid(){return Y.runtime.id==null&&this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(t){return this.signal.addEventListener("abort",t),()=>this.signal.removeEventListener("abort",t)}block(){return new Promise(()=>{})}setInterval(t,e){const r=setInterval(()=>{this.isValid&&t()},e);return this.onInvalidated(()=>clearInterval(r)),r}setTimeout(t,e){const r=setTimeout(()=>{this.isValid&&t()},e);return this.onInvalidated(()=>clearTimeout(r)),r}requestAnimationFrame(t){const e=requestAnimationFrame((...r)=>{this.isValid&&t(...r)});return this.onInvalidated(()=>cancelAnimationFrame(e)),e}requestIdleCallback(t,e){const r=requestIdleCallback((...s)=>{this.signal.aborted||t(...s)},e);return this.onInvalidated(()=>cancelIdleCallback(r)),r}addEventListener(t,e,r,s){var i;e==="wxt:locationchange"&&this.isValid&&this.locationWatcher.run(),(i=t.addEventListener)==null||i.call(t,e.startsWith("wxt:")?te(e):e,r,{...s,signal:this.signal})}notifyInvalidated(){this.abort("Content script context invalidated"),He.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){window.postMessage({type:B.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName},"*")}listenForNewerScripts(t){let e=!0;const r=s=>{var i,u;if(((i=s.data)==null?void 0:i.type)===B.SCRIPT_STARTED_MESSAGE_TYPE&&((u=s.data)==null?void 0:u.contentScriptName)===this.contentScriptName){const w=e;if(e=!1,w&&(t!=null&&t.ignoreFirstEvent))return;this.notifyInvalidated()}};addEventListener("message",r),this.onInvalidated(()=>removeEventListener("message",r))}};j(B,"SCRIPT_STARTED_MESSAGE_TYPE",te("wxt:content-script-started"));let re=B;const ze=Symbol("null");let Je=0;class Ge extends Map{constructor(){super(),this._objectHashes=new WeakMap,this._symbolHashes=new Map,this._publicKeys=new Map;const[t]=arguments;if(t!=null){if(typeof t[Symbol.iterator]!="function")throw new TypeError(typeof t+" is not iterable (cannot read property Symbol(Symbol.iterator))");for(const[e,r]of t)this.set(e,r)}}_getPublicKeys(t,e=!1){if(!Array.isArray(t))throw new TypeError("The keys parameter must be an array");const r=this._getPrivateKey(t,e);let s;return r&&this._publicKeys.has(r)?s=this._publicKeys.get(r):e&&(s=[...t],this._publicKeys.set(r,s)),{privateKey:r,publicKey:s}}_getPrivateKey(t,e=!1){const r=[];for(let s of t){s===null&&(s=ze);const i=typeof s=="object"||typeof s=="function"?"_objectHashes":typeof s=="symbol"?"_symbolHashes":!1;if(!i)r.push(s);else if(this[i].has(s))r.push(this[i].get(s));else if(e){const u=`@@mkm-ref-${Je++}@@`;this[i].set(s,u),r.push(u)}else return!1}return JSON.stringify(r)}set(t,e){const{publicKey:r}=this._getPublicKeys(t,!0);return super.set(r,e)}get(t){const{publicKey:e}=this._getPublicKeys(t);return super.get(e)}has(t){const{publicKey:e}=this._getPublicKeys(t);return super.has(e)}delete(t){const{publicKey:e,privateKey:r}=this._getPublicKeys(t);return!!(e&&super.delete(e)&&this._publicKeys.delete(r))}clear(){super.clear(),this._symbolHashes.clear(),this._publicKeys.clear()}get[Symbol.toStringTag](){return"ManyKeysMap"}get size(){return super.size}}new Ge;function tt(){}function J(n,...t){}const Ze={debug:(...n)=>J(console.debug,...n),log:(...n)=>J(console.log,...n),warn:(...n)=>J(console.warn,...n),error:(...n)=>J(console.error,...n)};return(async()=>{try{const{main:n,...t}=Ue,e=new re("twitter",t);return await n(e)}catch(n){throw Ze.error('The content script "twitter" crashed on startup!',n),n}})()}();
twitter;
