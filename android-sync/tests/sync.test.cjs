'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),vm=require('vm'),crypto=require('node:crypto'),zlib=require('node:zlib');
const repo=path.resolve(__dirname,'../..'),src=path.resolve(process.argv[2]||path.join(repo,'.v131/PlayersHype-Ecosystem-V1.3.1-RC'));
const {JSDOM}=require(path.join(src,'scripts/ui-tests/node_modules/jsdom'));
const original=JSON.parse(fs.readFileSync(path.join(repo,'docs/app/config.json'))),originalText=fs.readFileSync(path.join(repo,'docs/app/config.json'),'utf8');
let requests=[],chunks=[],serverConfig=originalText,serverHtml=null,failPublish=false,offline=false,remoteReads=0;
const doc=new JSDOM(fs.readFileSync(path.join(src,'app-admin/src/main/assets/index.html'),'utf8'),{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'outside-only'}),w=doc.window;
w.TextEncoder=TextEncoder;w.Blob=Blob;w.Response=Response;w.CompressionStream=CompressionStream;Object.defineProperty(w.crypto,'subtle',{value:crypto.webcrypto.subtle});w.confirm=()=>false;w.HTMLElement.prototype.scrollIntoView=()=>{};
// IDB mock stores structured copies. Browser/emulator verification uses actual IndexedDB.
const records=new Map();w.indexedDB={open(){const q={};queueMicrotask(()=>{q.result={createObjectStore(){},transaction(){const tx={};tx.objectStore=()=>({get(k){const r={};queueMicrotask(()=>{r.result=records.has(k)?structuredClone(records.get(k)):undefined;r.onsuccess?.()});return r},put(v,k){records.set(k,structuredClone(v));queueMicrotask(()=>tx.oncomplete?.())}});return tx}};q.onupgradeneeded?.();q.onsuccess?.()});return q}};
w.fetch=async url=>{if(offline)throw Error('offline');url=String(url);if(url.startsWith('https://raw.githubusercontent.com/')){remoteReads++;return new Response(serverConfig)}if(url==='/assets/sync/dashboard-export.html')return new Response(fs.readFileSync(path.join(src,'shared/src/main/assets/sync/dashboard-export.html')));if(url==='/assets/default-app-config.json')return new Response(fs.readFileSync(path.join(src,'app-admin/src/main/assets/default-app-config.json')));throw Error('Unexpected fetch '+url)};
w.HypeAndroid={request:async(action,p={})=>{requests.push([action,p]);if(action==='publisherStatus')return JSON.stringify({configured:true,owner:'playershype',repo:'playershype-android-v1',branch:'main'});if(action==='publishBegin'){chunks=[];return 'transfer'}if(action==='publishChunk'){chunks.push(Buffer.from(p.data,'base64'));return ''}if(action==='publishFinish'){if(failPublish)throw Error('Hay una publicación más reciente');const b=JSON.parse(Buffer.concat(chunks));const marker=b.html.match(/<script id="phPublishedConfig" type="application\/json">(.*?)<\/script>/s);assert(marker);const env=JSON.parse(marker[1]);const decoded=zlib.gunzipSync(Buffer.from(env.data,'base64')).toString();assert.equal(decoded,b.config);assert.equal(env.revision,b.revision);assert.equal(crypto.createHash('sha256').update(decoded).digest('hex'),env.sha256);assert.equal(b.baseHash,crypto.createHash('sha256').update(serverConfig).digest('hex'));if(b.target!=='app')serverConfig=b.config;if(b.target!=='dashboard')serverHtml=b.html;return JSON.stringify({ok:true,verified:true,revision:b.revision,commit:'verified-commit',target:b.target})}if(action==='publishAbort')return '';throw Error('Unexpected native action '+action)}};
w.HypeLive={workspace:()=>({cards:[],tracks:[]}),status:async()=>JSON.parse(await w.HypeAndroid.request('publisherStatus'))};
for(const f of [path.join(src,'app-admin/src/main/assets/config-contract.js'),path.join(repo,'android-sync/assets/publication.js'),path.join(repo,'android-sync/assets/sync.js')])w.eval(fs.readFileSync(f,'utf8'));
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,20))}throw Error('Timed out waiting for UI')}
(async()=>{
 const user=new JSDOM(fs.readFileSync(path.join(src,'app-user/src/main/assets/index.html'),'utf8'),{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'outside-only'}),u=user.window;
 let nativeCalls=0,origin='bundled',nativeOffline=false;u.scrollTo=()=>{};u.URL.createObjectURL=()=> 'blob:fixture';u.URL.revokeObjectURL=()=>{};
 const {raceDays,raceDayHistory,horseData,hypepredict,...home}=original;
 const {analyses,...predict}=hypepredict;
 u.fetch=async url=>{
  if(url==='/core/home-config')return new Response(JSON.stringify({...home,hypepredict:predict,__sync:{origin}}));
  assert.equal(url,'/assets/public-app-config.json');
  return new Response(fs.readFileSync(path.join(src,'app-user/src/main/assets/default-app-config.json')));
 };
 u.HypeNative={postMessage(raw){const m=JSON.parse(raw);assert.equal(m.action,'sync');nativeCalls++;if(!nativeOffline)origin='github';queueMicrotask(()=>u.HypeNative.onmessage({data:JSON.stringify({id:m.id,ok:!nativeOffline,value:'{}',error:'offline'})}))}};
 for(const tag of u.document.querySelectorAll('script[src]')){const name=tag.getAttribute('src').replace('/assets/','');const root=name.startsWith('native/')?'shared':'app-user';u.eval(fs.readFileSync(path.join(src,root,'src/main/assets',name),'utf8'))}
 await until(()=>u.document.getElementById('footerMode').textContent.includes('GitHub confirmado'));assert(nativeCalls>0);
 assert(!u.document.querySelector('#home').hasAttribute('aria-busy'));
 assert.equal(u.document.getElementById('liveImage').getAttribute('loading'),'lazy');
 nativeOffline=true;await u.PlayersHypeSync.refresh();assert(u.document.getElementById('footerMode').textContent.includes('Sin conexión'));u.close();
 console.log('PASS actual home HTML loads native bridge, requests sync and reports offline recovery');
 assert.equal(w.PHPublication.validate(original).revision,original.revision);console.log('PASS real 8.9 MB config validates without dropping history');
 const privateConfig=structuredClone(original);privateConfig.promptMaestro='private';assert.throws(()=>w.PHPublication.validate(privateConfig));
 const initial=await w.PHSync.initial();assert.equal(initial.revision,original.revision);assert(w.localStorage.getItem('playershype.publisher.base.v2').length<200);assert.deepEqual(records.get('base').raceDayHistory.camarero,original.raceDayHistory.camarero);console.log('PASS large data uses IndexedDB; localStorage contains metadata only');
 // Use the frozen published Camarero fixture retained by the current config.
 const archived=JSON.stringify(original.raceDayHistory);const snap=await w.PHSync.snapshot([],[],original);assert.equal(JSON.stringify(snap.raceDayHistory),archived);assert.equal(snap.hypepredict.analyses['camarero-2026-11-05-r7'].quickHits.select.hypeScore,8.9);console.log('PASS empty legacy workspace preserves reports, scores and archives');
 const seed=JSON.parse(fs.readFileSync(path.join(src,'app-user/src/main/assets/hypepredict/public-seed.json')));const mapped=w.PHPublication.mergeCards(original,[seed.cards[0]],[]);const select=mapped.hypepredict.analyses['belmont-2026-09-19-r1'].quickHits.select;assert.equal(select.hypeScore,8.8);assert.equal(mapped.hypepredict.analyses['camarero-2026-11-05-r7'].quickHits.select.hypeScore,8.9);assert.deepEqual(JSON.parse(JSON.stringify(mapped.raceDayHistory.camarero)),original.raceDayHistory.camarero);console.log('PASS legacy analysis adapter preserves scores and unrelated historical snapshots');
 w.eval(fs.readFileSync(path.join(src,'app-admin/src/main/assets/control.js'),'utf8'));await until(()=>w.document.getElementById('hero-title').value===original.home.hero.title);
 w.document.querySelector('[data-action="publish"]').click();await until(()=>w.document.getElementById('message').textContent.includes('Dashboard + App publicados'));assert(serverHtml);assert(requests.some(([a,p])=>a==='publishBegin'&&p.target==='both'));console.log('PASS actual combined Admin button streams both verified formats');
 const dashboard=serverConfig;w.document.querySelector('[data-action="live-update-app"]').click();await until(()=>w.document.getElementById('live-operation').textContent.includes('APP PUBLICADA'));assert.equal(serverConfig,dashboard);const app=serverHtml;console.log('PASS app-only button leaves Dashboard unchanged');
 w.document.querySelector('[data-action="live-update"]').click();await until(()=>w.document.getElementById('live-operation').textContent.includes('DASHBOARD PUBLICADO'));assert.equal(serverHtml,app);console.log('PASS Dashboard-only button leaves app publication unchanged');
 failPublish=true;const savedConfig=serverConfig;w.document.querySelector('[data-action="publish"]').click();await until(()=>w.document.getElementById('message').textContent.includes('No se completó'));assert.equal(serverConfig,savedConfig);assert(records.get('draft'));console.log('PASS conflict is visible; draft retained; no false success');
 const countBeforeDraftStartup=remoteReads;
 const savedDraft=await w.PHSync.draft();
 assert(savedDraft);
 await w.PHSync.initial();
 assert.equal(remoteReads,countBeforeDraftStartup,'Opening a saved draft must not fetch GitHub');
 assert.deepEqual(await w.PHSync.draft(),savedDraft);
 const beforeRefresh=remoteReads;
 await Promise.all([w.PHSync.remote(),w.PHSync.remote()]);
 assert.equal(remoteReads,beforeRefresh+1,'Concurrent refreshes must share the same request');
 offline=true;await assert.rejects(w.PHSync.remote());assert(records.get('draft'));console.log('PASS network failure retains cached data and draft');
 w.close();console.log('PASS synchronization integration tests');
})().catch(e=>{console.error(e);w.close();process.exit(1)});
