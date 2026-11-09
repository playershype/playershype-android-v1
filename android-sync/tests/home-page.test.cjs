'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),src=path.resolve(process.argv[2]||path.join(root,'.home-src/PlayersHype-Ecosystem-V1.3.1-RC'));
const {JSDOM}=require(path.join(src,'scripts/ui-tests/node_modules/jsdom'));
const original=JSON.parse(fs.readFileSync(path.join(root,'docs/app/config.json'))),snapshot=JSON.stringify(original);
const html=fs.readFileSync(path.join(src,'app-user/src/main/assets/index.html'),'utf8'),code=fs.readFileSync(path.join(src,'app-user/src/main/assets/home.js'),'utf8');
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Puerto_Rico',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function projection(){const {raceDays,raceDayHistory,horseData,hypepredict,...c}=structuredClone(original);const {analyses,...predict}=hypepredict;c.hypepredict=predict;c.homeDate=today;c.tracks=[{id:'camarero',name:'Hipódromo Camarero',date:today,publishedRaces:7,races:99}];return c}
let current=projection(),requests=0,offline=false,checks=0;
const dom=new JSDOM(html,{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.HypeAndroid={request:async()=>{if(offline)throw Error('offline')}};
w.fetch=async url=>{requests++;if(url==='/core/home-config')return {ok:true,json:async()=>structuredClone(current)};if(url==='/assets/public-app-config.json')return {ok:true,json:async()=>structuredClone(original)};throw Error('Unexpected request '+url)};
const tick=()=>new Promise(r=>setImmediate(r));
async function until(fn){for(let i=0;i<50;i++){if(fn())return;await new Promise(r=>setTimeout(r,10))}throw Error('Home did not reach expected state')}
function check(name,fn){fn();checks++;console.log('PASS',name)}
new vm.Script(code);w.eval(code);
(async()=>{
 await tick();await tick();
 check('Home shows verified current-day analyses, never registered race totals',()=>{assert.equal(d.querySelector('#pulseCount').textContent,'7');assert(d.querySelector('#tracksGrid').textContent.includes('7 análisis'));assert(!d.querySelector('#tracksGrid').textContent.includes('99'));assert(d.querySelector('#pulseTrackLinks a').href.endsWith('/navigate/predict?track=camarero'))});
 const initialRequests=requests;
 check('Whole hero opens a real page with published title, image and body',()=>{const link=d.querySelector('#heroOpen');link.focus();link.click()});await until(()=>!d.querySelector('#heroPage').hidden);
 check('Hero page participates in Back navigation and restores focus',()=>{assert.equal(d.querySelector('#heroPage').hidden,false);assert.equal(d.querySelector('#featuredTitle').textContent,current.home.hero.title);assert.equal(d.querySelector('#featuredBody p').textContent,current.home.hero.subtitle);assert.equal(d.activeElement.id,'featuredTitle');assert.equal(w.PlayersHypeRouter.back(),true);assert.equal(d.querySelector('#heroPage').hidden,true);assert.equal(d.activeElement.id,'heroOpen');assert.equal(w.PlayersHypeRouter.back(),false);assert.equal(requests,initialRequests)});
 current.home.hero={...current.home.hero,title:'Nuevo hero',image:'https://example.com/new.jpg',page:{title:'Página del destacado',body:'Primer párrafo.\n\nSegundo párrafo.'}};
 await w.PlayersHypeSync.refresh();
 check('Published edits actually refresh hero, photo and page contents together',()=>{assert.equal(d.querySelector('#heroTitle').textContent,'Nuevo hero');assert.equal(d.querySelector('#heroImage').src,'https://example.com/new.jpg');assert.equal(d.querySelector('#featuredTitle').textContent,'Página del destacado');assert.equal(d.querySelectorAll('#featuredBody p').length,2)});
 current.home.hero.page.body='<img src=x onerror=alert(1)>\n\n<script>bad()</script>';current.home.hero.title='<svg onload=bad()>';
 await w.PlayersHypeSync.refresh();
 check('Imported title and page body remain inert text',()=>{assert.equal(d.querySelector('#featuredBody script,#featuredBody img,#heroTitle svg'),null);assert(d.querySelector('#featuredBody').textContent.includes('<script>'))});
 current.homeDate='2000-01-01';current.tracks[0].date='2000-01-01';await w.PlayersHypeSync.refresh();
 check('A stale compact projection cannot become today’s jornada',()=>{assert.equal(d.querySelector('#pulseCount').textContent,'0');assert.equal(d.querySelector('#pulseEmpty').hidden,false);assert.equal(d.querySelectorAll('#tracksGrid .track').length,0)});
 current=projection();current.tracks=[];current.live.status='offline';await w.PlayersHypeSync.refresh();
 check('No fabricated live status or weather when data is absent',()=>{assert(!d.querySelector('#pulseLive').classList.contains('on-air'));assert(d.querySelector('#pulseLive').textContent.includes('Sin transmisión'));assert.equal(d.querySelector('#pulseCount').textContent,'0')});
 current.home.enabled.tv=false;current.home.hero.secondary={label:'TV',target:'tv'};await w.PlayersHypeSync.refresh();
 check('Disabled modules cannot be advertised as working destinations',()=>{assert.equal(d.querySelector('#heroSecondary').getAttribute('aria-disabled'),'true');assert.equal(d.querySelector('#featuredSecondary').getAttribute('aria-disabled'),'true')});
 current.home.hero.primary={label:'Ver destacado',target:'featured'};await w.PlayersHypeSync.refresh();
 check('Featured CTA opens the page and is omitted inside its own destination',()=>{assert.equal(d.querySelector('#heroPrimary').getAttribute('href'),'#destacado');assert.equal(d.querySelector('#heroPrimary').hidden,false);assert.equal(d.querySelector('#featuredPrimary').hidden,true)});
 offline=true;await w.PlayersHypeSync.refresh();
 check('Native sync failure keeps last available Home with offline status',()=>{assert(d.querySelector('#footerMode').textContent.includes('Sin conexión'));assert(d.querySelector('#heroTitle').textContent.length>0)});
 const adm=new JSDOM(fs.readFileSync(path.join(src,'app-admin/src/main/assets/index.html'),'utf8'),{url:'https://appassets.androidplatform.net/assets/index.html',runScripts:'outside-only'}),aw=adm.window;
 aw.eval(fs.readFileSync(path.join(src,'app-admin/src/main/assets/config-contract.js'),'utf8'));
 check('Contract retains and validates a bounded page and secondary destination',()=>{const c=structuredClone(original);c.home.hero.page={title:'Un destacado',body:'Contenido completo'};c.home.hero.primary.target='featured';const valid=aw.ConfigContract.validate(c);assert.equal(valid.home.hero.page.body,'Contenido completo');assert.equal(valid.home.hero.primary.target,'featured');c.home.hero.page.body='a'.repeat(6001);assert.throws(()=>aw.ConfigContract.validate(c));c.home.hero.page.body='<script>bad()</script>';assert.throws(()=>aw.ConfigContract.validate(c))});
 check('Admin exposes page, image URL, eyebrow and both CTAs',()=>{for(const id of ['hero-page-title','hero-page-body','hero-image-url','hero-eyebrow','hero-secondary-label','hero-secondary-target'])assert(aw.document.getElementById(id));assert(aw.document.querySelector('#previewPageBody'));assert(aw.document.querySelector('#hero-primary-target option[value=featured]'))});
 check('All published data stays untouched; no new runtime dependency',()=>{assert.equal(JSON.stringify(original),snapshot);assert(!code.includes('eval('));assert(!code.includes('setInterval('))});
 console.log('HOME_BYTES',Buffer.byteLength(html)+Buffer.byteLength(code));aw.close();w.close();console.log('PASS',checks,'Home checks (DOM, not APK installation)');
})().catch(e=>{w.close();console.error(e);process.exit(1)});
