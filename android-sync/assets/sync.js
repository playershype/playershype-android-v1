/* One snapshot, two routes, one non-forced Git ref update. Credentials stay native. */
(()=>{'use strict';
const CONFIG_URL='https://raw.githubusercontent.com/playershype/playershype-android-v1/main/docs/app/config.json',BASE_KEY='playershype.publisher.base.v2',DRAFT='playershype.admin.app-config.v1.2';
let baseHash='',busy=false,dbPromise,pendingRemote;
function database(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const q=indexedDB.open('playershype-publication-v2',1);q.onupgradeneeded=()=>q.result.createObjectStore('snapshots');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(Error('No se pudo abrir el almacenamiento local'))});return dbPromise}
async function storage(key,value){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('snapshots',value===undefined?'readonly':'readwrite'),store=tx.objectStore('snapshots');if(value===undefined){const q=store.get(key);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)}else{store.put(value,key);tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(Error('No se guardó el borrador'))}})}
async function draft(){const value=await storage('draft');if(value)return value;try{return JSON.parse(localStorage.getItem(DRAFT)||'null')}catch{return null}}
async function saveDraft(c){await storage('draft',c);localStorage.removeItem(DRAFT);return c}

const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(x=>x.toString(16).padStart(2,'0')).join('');
function remote(){
 if(!pendingRemote)pendingRemote=readRemote().finally(()=>{pendingRemote=null});
 return pendingRemote;
}
async function readRemote(){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(CONFIG_URL,{cache:'no-cache',signal:controller.signal});
  if(!response.ok)throw Error('No pude leer la configuración publicada: HTTP '+response.status);
  const text=await response.text();
  const config=PHPublication.validate(JSON.parse(text));
  const hash=await digest(text);
  await storage('base',config);
  localStorage.setItem(BASE_KEY,JSON.stringify({hash}));
  baseHash=hash;
  return config;
 }catch(error){
  if(controller.signal.aborted)throw Error('GitHub tardó demasiado en responder. Intenta actualizar de nuevo.');
  throw error;
 }finally{clearTimeout(timeout)}
}
async function saved(){try{const meta=JSON.parse(localStorage.getItem(BASE_KEY)||'null');return meta?{...meta,config:await storage('base')}:null}catch{return null}}
async function initial(draftPromise=draft()){
 const [previous,localDraft]=await Promise.all([saved(),draftPromise]);
 if(localDraft&&previous?.config&&previous.hash){
  baseHash=previous.hash;
  return previous.config;
 }
 try{return await remote()}catch(error){
  if(!previous?.config)throw error;
  baseHash=previous.hash;
  return previous.config;
 }
}
async function snapshot(cards,tracks,explicit){
 let c=explicit||(await draft())||(await saved())?.config;
 if(!baseHash){const s=await saved();if(s?.hash)baseHash=s.hash;else {const published=await remote();c=c||published}}
 if(!c)throw Error('Carga primero una configuración publicada o importa tu respaldo');
 c=PHPublication.validate(c);
 // An empty workspace must not erase the remote configuration or historical days.
 if(Array.isArray(cards)&&cards.length){if(window.HypeExportsReady)await HypeExportsReady;const html=HypeExports.public(cards,tracks||[],false);const doc=new DOMParser().parseFromString(html,'text/html');const clean=JSON.parse(doc.getElementById('embeddedData').textContent);const registry=JSON.parse(doc.getElementById('embeddedTrackRegistry').textContent);c=PHPublication.mergeCards(c,clean,registry)}
 c.revision='pub-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
 return c;
}
async function pack(config){
 if(typeof CompressionStream==='undefined')throw Error('Esta versión de WebView no admite compresión; actualiza Android System WebView');
 const json=JSON.stringify(config),sha256=await digest(json);const stream=new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));const bytes=new Uint8Array(await new Response(stream).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const envelope={schemaVersion:1,revision:config.revision,sha256,encoding:'gzip-base64',data:btoa(binary)};
 const r=await fetch('/assets/sync/dashboard-export.html');if(!r.ok)throw Error('Falta el lector público empaquetado');let html=await r.text();
 html=html.replace('</head>','<script id="phPublishedConfig" type="application/json">'+JSON.stringify(envelope).replace(/</g,'\\u003c')+'</script></head>');
 return {config:json,html,revision:config.revision,sha256};
}
async function publish(target='both',cards,tracks,explicit){
 if(busy)throw Error('Ya hay una publicación en curso');busy=true;let transfer;
 try{
  if(!window.HypeAndroid)throw Error('Publicar requiere el Admin APK');
  const c=await snapshot(cards,tracks,explicit),bundle=await pack(c),payload={...bundle,baseHash,target};const blob=new Blob([JSON.stringify(payload)],{type:'application/json'});
  transfer=await HypeAndroid.request('publishBegin',{size:blob.size,mime:'application/json',target});
  for(let start=0;start<blob.size;start+=196608){const bytes=new Uint8Array(await blob.slice(start,start+196608).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));await HypeAndroid.request('publishChunk',{transfer,data:btoa(binary)})}
  const result=JSON.parse(await HypeAndroid.request('publishFinish',{transfer,message:'Publish '+target+' · '+bundle.revision}));
  if(!result.ok||result.revision!==bundle.revision||result.verified!==true)throw Error('La publicación no quedó verificada');
  if(target!=='app'){baseHash=bundle.sha256;await storage('base',c);localStorage.setItem(BASE_KEY,JSON.stringify({hash:baseHash}));await saveDraft(c)}
  return result;
 }catch(e){if(transfer)HypeAndroid.request('publishAbort',{transfer}).catch(()=>{});throw e}finally{busy=false}
}
window.PHSync=Object.freeze({remote,initial,snapshot,pack,publish,digest,draft,saveDraft});
// Preserve import, backup and original analysis tools while routing their publish actions.
const legacy=window.HypeLive;
if(legacy)window.HypeLive=Object.freeze({...legacy,updateApp:(cards,tracks)=>publish('app',cards,tracks),updateLive:(cards,tracks)=>publish('dashboard',cards,tracks),publishGenerated:()=>publish('dashboard',legacy.workspace().cards,legacy.workspace().tracks)});
})();
