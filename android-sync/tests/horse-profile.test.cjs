'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const expanded=path.resolve(process.argv[2]||path.join(root,'.v131/PlayersHype-Ecosystem-V1.3.1-RC'));
const {JSDOM}=require(path.join(expanded,'scripts/ui-tests/node_modules/jsdom'));
const config=JSON.parse(fs.readFileSync(path.join(root,'docs/app/config.json'),'utf8'));
const horses=Object.values(config.hypepredict.analyses).filter(a=>a.raceId?.startsWith('camarero-2026-11-05-')).flatMap(a=>a.horses);
const rafael=horses.find(h=>h.name==='Rafael J');assert(rafael);assert.equal(horses.length,40);
const before=JSON.stringify(config);let checks=0;
function check(name,fn){fn();console.log('PASS',name);checks++}
function create(rel){
 const html=fs.readFileSync(path.join(root,rel),'utf8');
 const dom=new JSDOM(html,{url:'https://playershype.test/hypepredict/?track=camarero&date=2026-11-05#race-7',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.scrollTo=()=>{};w.fetch=async url=>{if(String(url).includes('config.json'))return {ok:true,json:async()=>config};throw Error('offline weather')};
 for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)){new vm.Script(m[1]);if(rel.includes('hypepredict'))w.eval(m[1]);}
 return dom;
}
(async()=>{
 const dom=create('docs/hypepredict/index.html'),w=dom.window,d=w.document;
 await new Promise(resolve=>setImmediate(resolve));
 check('Actual R7 profile opens from full field',()=>{const b=[...d.querySelectorAll('[data-horse-index]')].find(b=>b.textContent.includes('Rafael J'));assert(b);b.focus();b.click();assert(d.querySelector('#horseModal.open .profile-panel'));assert.equal(d.querySelector('#profileName').textContent,'Rafael J');assert.equal(d.activeElement.id,'closeHorse')});
 check('Connections, form and workouts use semantic tables',()=>{assert.equal(d.querySelectorAll('.profile-panel table').length,3);assert.equal(d.querySelectorAll('#horseModal .profile-work-table tbody tr').length,3);assert.equal(d.querySelectorAll('#horseModal .profile-result').length,5);assert.equal(d.querySelectorAll('.profile-panel pre').length,0);assert(d.querySelector('.profile-panel').textContent.includes('Jorge I. Velez'));assert(d.querySelector('.profile-panel').textContent.includes('24'))});
 check('Reading and recommended use preserved verbatim',()=>{const data=w.hpProfileData(rafael);assert.equal(d.querySelector('#horseModal .profile-reading p').textContent,data.get('LECTURA'));assert.equal(d.querySelector('#horseModal .profile-use strong').textContent,w.hpDataText(data.get('USO')))});
 check('Closing returns keyboard focus to horse',()=>{d.querySelector('#closeHorse').click();assert(!d.querySelector('#horseModal.open'));assert(d.activeElement.hasAttribute('data-horse-index'))});
 check('All 40 published profiles render without modifying data',()=>{for(const h of horses){const doc=new JSDOM(w.hpHorseProfile(h,7)).window.document;assert.equal(doc.querySelector('h2').textContent,h.name);assert(!doc.querySelector('script,iframe,img'));assert.equal(doc.querySelectorAll('.profile-metric').length,4);}assert.equal(JSON.stringify(config),before)});
 check('Imported markup and multiline fields stay text',()=>{const h={name:'<img src=x onerror=alert(1)>',sourceText:'Jinete: <script>alert(1)</script>\nUniforme: Primera línea\nSegunda línea\nBriseos disponibles: <img src=x> | B\nLECTURA:\nPrimera lectura\nSegunda lectura\nUSO:\nCo-base'};const data=w.hpProfileData(h);assert.equal(data.get('Uniforme'),'Primera línea\nSegunda línea');const doc=new JSDOM(w.hpHorseProfile(h,1)).window.document;assert.equal(doc.querySelector('script,img'),null);assert.equal(doc.querySelectorAll('.profile-work-table tbody tr').length,2);assert.equal(doc.querySelector('.profile-reading p').textContent,'Primera lectura\nSegunda lectura')});
 check('Missing data remains explicitly unpublished; zero is retained',()=>{const doc=new JSDOM(w.hpHorseProfile({name:'Sin datos',hypeScore:0,raceData:{daysSinceLastRace:0}},1)).window.document;assert.equal(doc.querySelector('.primary strong').textContent,'0');assert.equal(doc.querySelectorAll('.profile-metric strong')[3].textContent,'0');assert(doc.body.textContent.includes('No disponible'));assert.equal(doc.querySelectorAll('.profile-work-table tbody tr').length,0)});
 check('App HTML parses and retains exact signed data envelope',()=>{create('docs/app/index.html').window.close();const current=fs.readFileSync(path.join(root,'docs/app/index.html'),'utf8');const old=execFileSync('git',['show','HEAD:docs/app/index.html'],{cwd:root,encoding:'utf8',maxBuffer:4e6});const envelope=s=>s.match(/<script id="phPublishedConfig"[^>]*>[\s\S]*?<\/script>/)[0];assert.equal(envelope(current),envelope(old));assert(current.includes('modal.innerHTML=hpHorseProfile(h,n)'))});
 const t=performance.now();for(let i=0;i<100;i++)for(const h of horses)w.hpHorseProfile(h,7);console.log('PROFILE_BENCH_MS_PER_OPEN',((performance.now()-t)/4000).toFixed(3));
 w.close();console.log('PASS',checks,'profile integration checks (DOM; not Android installation)');
})().catch(e=>{console.error(e);process.exit(1)});
