'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),source=path.resolve(process.argv[2]);
const {JSDOM}=require(path.join(source,'scripts/ui-tests/node_modules/jsdom'));
const config=JSON.parse(fs.readFileSync(path.join(root,'docs/app/config.json'))),before=JSON.stringify(config);
const dom=new JSDOM(fs.readFileSync(path.join(root,'docs/hypepredict/index.html'),'utf8'),{url:'https://ph.test/?track=auto-horseshoe-indianapolis&date=2026-11-10#race-1',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;w.scrollTo=()=>{};w.fetch=async url=>{if(String(url).includes('config.json'))return {ok:true,json:async()=>config};throw Error('offline')};
for(const m of fs.readFileSync(path.join(root,'docs/hypepredict/index.html'),'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)){new vm.Script(m[1]);w.eval(m[1])}
(async()=>{
 await new Promise(r=>setImmediate(r));
 assert.equal(d.querySelector('details.more summary').textContent,'Checklist completo · 7 ejemplares');assert(!d.body.textContent.includes('Leer el análisis original íntegro'));
 for(const selector of ['.quick-cell','.horse-row','.pace-runner','.finish-runner']){
  const button=d.querySelector(selector);assert(button?.hasAttribute('data-horse-index'),selector);const expected=button.getAttribute('aria-label').replace('Abrir ficha de ','');button.focus();button.click();assert.equal(d.querySelector('#profileName').textContent,expected);d.querySelector('#closeHorse').click();assert.equal(d.activeElement,button);
 }
 const row=d.querySelector('.horse-row');row.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert(d.querySelector('#horseModal.open'));d.querySelector('#closeHorse').click();
 assert.deepEqual([...d.querySelectorAll('.pace-label')].map(e=>e.textContent),['Closer','Stalker','Presser','Speed']);
 assert(d.querySelector('.bet-ticket'));assert.equal(d.querySelectorAll('.bet-table tbody tr').length,3);assert(d.querySelector('.bet-totals').textContent.includes('$18.00'));assert(d.querySelector('.bet-totals').textContent.includes('36'));assert(!d.querySelector('.wager').textContent.includes('derivedCost'));
 const search=d.querySelector('.checklist-search');search.value='Simone';search.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(d.querySelectorAll('.checklist-horse:not([hidden])').length,1);
 const h={name:'Test',programNumber:2,hypeScore:0,connections:{trainer:{name:'Trainer',record:{starts:10,wins:2},period:'2026',context:'Dirt'}},sourceText:'Jinete: <script>bad()</script>\nBriseos disponibles: 15 Sep 26 Ind 4F ft :49.20 Breezing 18/55 | Texto no estructurado\nLECTURA:\nMantener lectura\nUSO:\n["co-base"]'};
 const test=new JSDOM(w.hpHorseProfile(h,1)).window.document;assert.equal(test.querySelector('script'),null);assert.equal(test.querySelectorAll('.profile-work-table tbody tr').length,2);assert(test.body.textContent.includes('18/55'));assert(test.body.textContent.includes('2026'));assert(test.body.textContent.includes('Dirt'));assert(test.body.textContent.includes('No disponible'));assert.equal(test.querySelector('.primary strong').textContent,'0');
 const invalid=new JSDOM(w.hpWager({hypeBet:'[{broken'})).window.document;assert(!invalid.body.textContent.includes('[{broken'));const hostile=new JSDOM(w.hpWager({hypeBet:[{betType:'<img src=x>',positions:[{position:1,horses:['<script>']}],unit:0,derivedCost:0,combinations:0}]})).window.document;assert(!hostile.querySelector('img,script'));assert(hostile.body.textContent.includes('$0.00'));
 const a=Object.values(config.hypepredict.analyses).find(a=>a.raceId?.includes('2026-11-10-r1')&&a.raceId.includes('indian'));
 const button=d.querySelector('.checklist-horse .data-table [data-sort-column]');button.click();assert.equal(button.closest('th').getAttribute('aria-sort'),'ascending');button.click();assert.equal(button.closest('th').getAttribute('aria-sort'),'descending');
 assert.equal(JSON.stringify(config),before);
 const day=w.hpDayView({id:a.trackId,name:'Track'},{date:'2026-11-10',races:[{id:a.raceId,number:1}]});assert(!day.includes('Radiografía'));assert(!day.includes('PULSO'));assert(day.includes('day-race'));
 console.log('PASS reader refresh: linked Quick Hits, keyboard HypeBoard, pace/arrival circles, structured HypeBet, searchable checklist, sortable tables, scoped statistics, malicious text and unchanged publication');w.close();
})().catch(e=>{console.error(e);w.close();process.exitCode=1});
