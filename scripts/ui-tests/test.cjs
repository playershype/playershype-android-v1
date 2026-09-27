'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const seed=JSON.parse(fs.readFileSync('app-user/src/main/assets/hypepredict/public-seed.json'));
let count=0;
function check(label,fn){fn();count++;console.log('PASS',label)}
function create(mode,inject=false){
 const base=mode==='public'?'app-user':'app-admin';
 let html=fs.readFileSync(`${base}/src/main/assets/hypepredict/${mode==='public'?'public-template':'admin'}.html`,'utf8');
 html=html.replaceAll('__HP_PUBLIC_CARDS__',JSON.stringify(seed.cards).replaceAll('<','\\u003c')).replaceAll('__HP_PUBLIC_TRACKS__',JSON.stringify(seed.tracks)).replaceAll('__HP_PUBLIC_META__',JSON.stringify({latestDate:'2026-09-19',origin:'bundled'}));
 if(inject)html=html.replace('<script id="embeddedData" type="application/json">[]</script>','<script id="embeddedData" type="application/json">'+JSON.stringify(seed.cards).replaceAll('<','\\u003c')+'</script>');
 const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>{if(!e.message.includes('navigation'))errors.push(e.message)});
 const dom=new JSDOM(html,{url:`https://appassets.androidplatform.net/assets/hypepredict/${mode}.html`,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
 const w=dom.window;w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.alert=()=>{};w.confirm=()=>false;w.fetch=async()=>{throw Error('offline test')};w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};
 for(const file of ['runtime.js','module.js'])w.eval(fs.readFileSync(`${base}/src/main/assets/hypepredict/${file}`,'utf8'));
 return {w,errors};
}
(async()=>{
 const {w,errors}=create('public');const d=w.document;
 check('Original public Track Hub renders',()=>assert(d.querySelectorAll('[data-trackhub-open]').length>=4));
 check('No public admin import/publish/gateway controls',()=>assert.equal(d.querySelector('#importMasterInput,#hpResultsConfig,[data-nav="postmortem"],#publishLiveBtn'),null));
 check('Search and favorites retained',()=>assert(d.querySelector('#hpReaderSearch')&&d.querySelector('#hpReaderFavoriteFilter')));
 d.querySelector('[data-trackhub-history]').click();check('Historical cards dialog opens',()=>assert(d.querySelector('#trackHistoryModal').classList.contains('open')));d.querySelector('#closeTrackHistory').click();
 w.HypePublic.openTrack('camarero');check('Internal track route opens original card',()=>assert(d.querySelector('[data-nav="race"]')));
 d.querySelector('[data-nav="race"]').click();check('Original race / horse UI renders',()=>assert(d.querySelector('[data-horse-id]')));
 d.querySelector('[data-horse-id]').click();check('Horse drawer opens',()=>assert.equal(d.querySelector('#drawer').getAttribute('aria-hidden'),'false'));
 d.querySelector('#horseTailBtn').click();await new Promise(r=>setTimeout(r,130));check('Tale of the Tape retained',()=>assert(d.querySelector('#hpTailClose')));d.querySelector('#hpTailClose').click();d.querySelector('[data-horse-id]').click();
 check('Back dismisses horse before leaving race',()=>{assert(w.__hpAndroidBack());assert.equal(d.querySelector('#drawer').getAttribute('aria-hidden'),'true')});
 check('Back returns race to card and card to Track Hub',()=>{assert(w.__hpAndroidBack());assert(w.__hpAndroidBack());assert(d.querySelector('#hpReaderSearch'))});
 check('Navigation state persisted for recreation',()=>assert(w.localStorage.getItem('playershype.public.navigation.v1')));
 w.HypePublic.openTrack('camarero');check('No gateway controls on card',()=>assert.equal(d.querySelector('#hpResultsConfig'),null));
 check('PNG/PDF/JPG export controls retained',()=>{for(const id of ['viewPngBtn','viewPdfBtn','viewJpgBtn'])assert.equal(typeof d.getElementById(id).onclick,'function')});
 await new Promise(r=>setTimeout(r,650));check('Offline public render has no uncaught DOM errors',()=>assert.deepEqual(errors,[]));w.close();
 const admin=create('admin',true);check('Original Admin supports loaded card fixture',()=>assert(admin.w.document.querySelector('[data-nav="postmortem"]')||admin.w.document.querySelector('#loadModal')));
 check('Original Admin import preserved',()=>assert(admin.w.document.querySelector('#importMasterInput')));
 admin.w.fetch=async url=>{const path=String(url).replace('/assets/','');const file=path==='public-projection.json'?'shared/src/main/assets/'+path:'app-admin/src/main/assets/'+path;return {ok:true,text:async()=>fs.readFileSync(file,'utf8')}};
 Object.defineProperty(admin.w.crypto,'subtle',{value:require('node:crypto').webcrypto.subtle});admin.w.TextEncoder=TextEncoder;
 admin.w.eval(fs.readFileSync('app-admin/src/main/assets/hypepredict/export-support.js','utf8'));await admin.w.HypeExportsReady;
 const privateCards=JSON.parse(JSON.stringify(seed.cards));privateCards[0].promptMaestro='MUST_NOT_LEAK';privateCards[0].event.hypeScoreWeights={private:'MUST_NOT_LEAK'};
 const exported=admin.w.HypeExports.public(privateCards,seed.tracks,false);
 check('Public HTML export excludes private fields and uses standalone renderer',()=>{assert(!exported.includes('MUST_NOT_LEAK'));assert(!exported.includes('generatePublicDashboard'));assert(!exported.includes('<script src='));assert(exported.includes('sha256-'));});
 const exportDoc=new JSDOM(exported).window.document;
 check('Export inline scripts exactly match CSP hashes',()=>{const policy=exportDoc.querySelector('meta[http-equiv="Content-Security-Policy"]').content;for(const script of exportDoc.querySelectorAll('script:not([type="application/json"])')){const hash=require('node:crypto').createHash('sha256').update(script.textContent).digest('base64');assert(policy.includes('sha256-'+hash))}});
 check('Admin HTML snapshot retains original executable module',()=>assert(admin.w.HypeExports.admin(admin.w.document.documentElement.cloneNode(true)).includes('function hpBuildAdminSnapshotArtifact')));
 await new Promise(r=>setTimeout(r,650));check('Admin DOM has no uncaught errors',()=>assert.deepEqual(admin.errors,[]));admin.w.close();
 require('../../app-admin/src/main/assets/config-contract.js');
 const c=globalThis.ConfigContract;
 check('Draft contract validates all initial sections',()=>{for(const [k,v]of Object.entries(c.definitions))c.validate(k,v.initial)});
 check('Draft rejects executable config',()=>assert.throws(()=>c.validate('live',{schemaVersion:1,status:'live',title:'<script>alert(1)</script>',url:''})));
 check('Draft rejects credential storage',()=>assert.throws(()=>c.validate('registry',{schemaVersion:1,version:'1',compatibleSchema:1,prompt:'',config:{token:'secret'}})));
 check('Compatibility gate rejects unknown schema',()=>assert.throws(()=>c.validate('registry',{schemaVersion:1,version:'1',compatibleSchema:2,prompt:'',config:{}})));
 check('Draft rejects non-HTTPS links and duplicate IDs',()=>{assert.throws(()=>c.validate('live',{schemaVersion:1,status:'live',title:'',url:'http://bad.test'}));assert.throws(()=>c.validate('tracks',{schemaVersion:1,items:[{id:'same'},{id:'same'}]}))});
 console.log(`PASS: ${count} JavaScript integration checks (DOM, not device installation)`);
})().catch(e=>{console.error(e);process.exit(1)});

