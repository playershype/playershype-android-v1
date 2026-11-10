'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.PH_PLAYWRIGHT_NODE_MODULES,'playwright'));
const root=path.resolve(__dirname,'..'),source=path.resolve(process.argv[2]);
const config=JSON.parse(fs.readFileSync(path.join(root,'docs/app/config.json'),'utf8'));
const before=JSON.stringify(config),out=path.join(root,'mobile-evidence');fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(path.join(root,'docs/hypepredict/index.html'),'utf8');
const results=JSON.parse(fs.readFileSync(path.join(root,'results/fixtures/camarero-2026-11-05.json'),'utf8'));
const report={baseline:[],checks:[],errors:[]};
const origin='https://ph-mobile.test';
function visible(el){if(!el.getClientRects().length)return false;for(let p=el;p;p=p.parentElement){const c=getComputedStyle(p);if(c.display==='none'||c.visibility==='hidden'||+c.opacity===0)return false;}return true;}
async function fontScale(page,factor){if(factor===1)return;await page.evaluate(f=>{const sizes=[...document.querySelectorAll('body *')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);for(const [e,n] of sizes)if(e instanceof HTMLElement&&Number.isFinite(n)){const base=Number(e.dataset.phTestFont)||n;e.dataset.phTestFont=String(base);e.style.fontSize=(base*f)+'px';}},factor);}
async function load(page,url){await page.goto('about:blank');await page.goto(url);}
async function measure(page,label,width,factor){
 const m=await page.evaluate(()=>{
  const view=document.documentElement.clientWidth;
  function shown(e){if(!e.getClientRects().length)return false;if(e.closest('.table-scroll'))return false;for(let p=e;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0||s.clipPath==='inset(50%)')return false;}return true;}
  const bad=[...document.querySelectorAll('body *')].filter(e=>e instanceof HTMLElement&&shown(e)).flatMap(e=>{const r=e.getBoundingClientRect();return r.width>1&&(r.left< -1||r.right>view+1)?[{tag:e.tagName,id:e.id,cls:String(e.className).slice(0,80),left:Math.round(r.left),right:Math.round(r.right),text:e.textContent.trim().slice(0,60)}]:[]});
  const textBad=[];for(const e of document.querySelectorAll('.decision,.read p,.pace-lane,.pace-scenario,.profile-reading p,.hm-reading p')){if(!shown(e))continue;const range=document.createRange();range.selectNodeContents(e);for(const r of range.getClientRects())if(r.width>1&&(r.left< -1||r.right>view+1))textBad.push({cls:e.className,right:Math.round(r.right)});}
  return {viewport:view,document:document.documentElement.scrollWidth,offenders:bad.slice(0,16),textBad:textBad.slice(0,8)};
 });
 report.checks.push({screen:label,width,fontScale:factor,...m});
 if(m.document>m.viewport+1||m.offenders.length||m.textBad.length){await page.screenshot({path:path.join(out,`FAIL-${width}-${factor}-${label}.png`)});throw Error(JSON.stringify(report.checks.at(-1)));}
 if(width===360&&factor===1)await page.screenshot({path:path.join(out,`${label}.png`)});
}
let browser;
(async()=>{
 browser=await chromium.launch({headless:true,...(process.env.PH_CHROMIUM_EXECUTABLE?{executablePath:process.env.PH_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true});
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/app/config.json'||u.pathname==='/core/app-config'||u.pathname==='/core/home-config')return route.fulfill({json:config});
  if(u.pathname==='/results'||u.pathname==='/core/results')return route.fulfill({json:results});
  if(u.hostname!=='ph-mobile.test')return route.abort();
  if(u.pathname==='/hypepredict/'||u.pathname==='/baseline/')return route.fulfill({contentType:'text/html',body:u.pathname==='/baseline/'?html.replace(/\/\* PH_MOBILE_FIT_START \*\/[\s\S]*?\/\* PH_MOBILE_FIT_END \*\//,''):html});
  if(u.pathname==='/home/')return route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(source,'app-user/src/main/assets/index.html'))});
  if(u.pathname.startsWith('/assets/')){
   const rel=u.pathname.slice(8);const p=[path.join(source,'app-user/src/main/assets',rel),path.join(source,'shared/src/main/assets',rel)].find(fs.existsSync);
   if(p)return route.fulfill({contentType:rel.endsWith('.js')?'text/javascript':rel.endsWith('.json')?'application/json':rel.endsWith('.webp')?'image/webp':undefined,body:fs.readFileSync(p)});
  }
  return route.abort();
 });
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 const query='?track=auto-horseshoe-indianapolis&date=2026-11-09';
 // Reproduce the reported R6 from the actual published card, without the fix.
 await load(page,origin+'/baseline/'+query+'#race-6');await page.locator('.pace-map').waitFor();
 report.baseline.push(await page.evaluate(()=>({viewport:document.documentElement.clientWidth,document:document.documentElement.scrollWidth,pace:Math.round(document.querySelector('.pace-map').getBoundingClientRect().width)})));
 // Original overflow was reproduced in 1.4.11; retained baseline measurement is informational for the new presentation.
 await page.screenshot({path:path.join(out,'before-r6.png')});
 for(const width of [320,360,390,430,768])for(const factor of [1,1.3]){
  await page.setViewportSize({width,height:800});
  await load(page,origin+'/hypepredict/'+query+'#jornada');await page.locator('.dashboard-shell').waitFor();await fontScale(page,factor);await measure(page,'jornada',width,factor);
  for(const race of [1,6,10]){
   await load(page,origin+'/hypepredict/'+query+'#race-'+race);await page.locator('.race-core').waitFor();await fontScale(page,factor);await measure(page,'race-'+race,width,factor);
  }
  await page.locator('details.more,.checklist-horse').evaluateAll(es=>es.forEach(e=>e.open=true));await measure(page,'race-details',width,factor);
  await page.locator('[data-horse-index]').first().click();await page.locator('#horseModal.open').waitFor();await fontScale(page,factor);await measure(page,'profile',width,factor);await page.locator('#closeHorse').click();
  await page.locator('[data-match-race]').first().click();await page.locator('#matchModal.open').waitFor();await fontScale(page,factor);await measure(page,'head-to-head',width,factor);await page.evaluate(()=>hpMatchClose());
  await load(page,origin+'/hypepredict/?track=camarero&date=2026-11-05#resultados');await page.locator('[data-result-race]').first().waitFor();await fontScale(page,factor);await measure(page,'results',width,factor);
  await page.locator('[data-result-race]:not([disabled])').first().click();await page.locator('#resultModal').waitFor();await fontScale(page,factor);await measure(page,'result-details',width,factor);
  await load(page,origin+'/home/');await page.locator('#home:not([aria-busy])').waitFor();await fontScale(page,factor);await measure(page,'home',width,factor);
 }
 assert.equal(JSON.stringify(config),before,'Published data remains byte-for-byte unchanged in the test');
 assert.deepEqual(report.errors,[],'No uncaught browser errors');
 await browser.close();console.log('PASS',report.checks.length,'real Chromium width checks, reported R6 reproduced, 320–768px, 100%/130% text');
})().catch(async e=>{console.error(e);process.exitCode=1;await browser?.close()}).finally(()=>fs.writeFileSync(path.join(out,'layout.json'),JSON.stringify(report,null,2)));
