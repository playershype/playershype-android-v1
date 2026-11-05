#!/usr/bin/env node
'use strict';
// Repackage user-approved Camarero MasterData without calculating new HypeScores.
const fs=require('node:fs'), assert=require('node:assert/strict'), crypto=require('node:crypto'), zlib=require('node:zlib'), path=require('node:path');
process.chdir(path.resolve(__dirname,'..'));
require('./../android-sync/assets/publication.js');
const adapter=globalThis.PHPublication;
assert(adapter && typeof adapter.mergeCards==='function');
const card=JSON.parse(fs.readFileSync('docs/app/imports/camarero-2026-11-05.card.json','utf8'));
const old=JSON.parse(fs.readFileSync('docs/app/config.json','utf8'));
const historic=JSON.parse(JSON.stringify(old.raceDayHistory));
assert.equal(card.event.track,'Hipódromo Camarero');
assert.equal(card.event.date,'2026-11-05');
assert.equal(card.races.length,7);
assert(!Object.keys(old.hypepredict.analyses).some(k=>k.startsWith('camarero-2026-11-05-')),'Do not replace a previously published card');
const baseline=old.hypepredict.analyses['camarero-2026-11-01-r2']?.quickHits?.select?.hypeScore;
let count=0;
for(let i=0;i<card.races.length;i++){
 const r=card.races[i],n=r.raceNumber;
 assert.equal(n,i+1);
 assert(r.horses.length>=4);
 assert.equal(r.horses.length,r.hypeBoard.length);
 const roles=['Select','Contendiente','Tapada','Huevazo'],keys=['select','rival','sleeper','huevazo'],numbers=new Set();
 for(let j=0;j<r.horses.length;j++){
  const h=r.horses[j],b=r.hypeBoard[j];
  assert.equal(b.horseNumber,h.programNumber);
  assert.equal(b.rank,j+1);
  assert.equal(h.model.hypeScore,b.hypeScore);
  assert.equal(h.model.reliability,b.reliability);
  assert(typeof h.model.hypeScore==='number'&&h.model.hypeScore>=0&&h.model.hypeScore<=10);
  assert(!numbers.has(h.programNumber));
  numbers.add(h.programNumber);
  if(j<4){assert.equal(h.roles.primary,roles[j]);assert.equal(r.quickHits[keys[j]].horseNumber,h.programNumber)}
 }
 count+=r.horses.length;
}
assert.equal(count,40);
// The Nov 3 "Camarero" schedule is a known mislabeled Horseshoe import.
// Keep its analysis records unchanged, but do not archive its wrong schedule as Camarero.
const prior=old.raceDays?.camarero;
if(prior?.date==='2026-11-03'&&prior.races?.[0]?.entries?.some(h=>h.name==='Tank Walk'))old.raceDays.camarero={days:[]};
const published=adapter.mergeCards(old,[card],old.tracks);
const revision='pub-2026-11-05-camarero-'+crypto.createHash('sha256').update(JSON.stringify(card)).digest('hex').slice(0,12);
published.revision=revision;
adapter.validate(published);
assert.equal(published.hypepredict.analyses['camarero-2026-11-01-r2']?.quickHits?.select?.hypeScore,baseline);
for(const [date,snap] of Object.entries(historic.camarero||{}))assert.deepEqual(published.raceDayHistory.camarero[date],snap,'History changed: '+date);
for(let i=1;i<=7;i++){
 const rid='camarero-2026-11-05-r'+i, a=published.hypepredict.analyses[rid];
 assert.equal(a.status,'published');
 assert.equal(a.trackId,'camarero');
 assert.equal(a.raceId,rid);
 assert.equal(a.horses.length,a.hypeBoard.length);
 for(const [j,k] of ['select','rival','sleeper','huevazo'].entries())assert.equal(a.quickHits[k].programNumber,a.hypeBoard[j].programNumber);
}
const days=published.raceDays.camarero.days;
assert(days.some(d=>d.date==='2026-11-05'&&d.races.length===7&&d.status==='published'));
assert(!days.some(d=>d.date==='2026-11-03'));
const configText=JSON.stringify(published), configBytes=Buffer.from(configText,'utf8');
assert(configBytes.length<24*1024*1024);
const sha256=crypto.createHash('sha256').update(configBytes).digest('hex');
const envelope={schemaVersion:1,revision,sha256,encoding:'gzip-base64',data:zlib.gzipSync(configBytes,{level:9}).toString('base64')};
const template=fs.readFileSync('docs/hypepredict/index.html','utf8');
assert(template.includes('const next=await res.json();'));
assert(template.includes('const res=await fetch(url.href,'));
assert(template.includes('quickPick("HUEVAZO",h)'));
const injection=[
 "const embedded=document.getElementById('phPublishedConfig');let next;",
 "if(embedded){const envelope=JSON.parse(embedded.textContent);",
 "const raw=Uint8Array.from(atob(envelope.data),c=>c.charCodeAt(0));",
 "const json=await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text();",
 "const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(json)))).map(v=>v.toString(16).padStart(2,'0')).join('');",
 "if(hash!==envelope.sha256)throw Error('Integridad inválida');",
 "next=JSON.parse(json);if(next.revision!==envelope.revision)throw Error('Revisión incompatible');}else next=await res.json();"
].join('\n');
let html=template.replace('const next=await res.json();',injection);
html=html.replace('const res=await fetch(url.href,',"const res=document.getElementById('phPublishedConfig')?{ok:true}:await fetch(url.href,");
html=html.replace('</head>','<script id="phPublishedConfig" type="application/json">'+JSON.stringify(envelope).replace(/</g,'\\u003c')+'</script></head>');
assert(html.includes(envelope.data.slice(0,50)));
const roundtrip=JSON.parse(zlib.gunzipSync(Buffer.from(envelope.data,'base64')).toString('utf8'));
assert.deepEqual(roundtrip,published);
assert(Buffer.byteLength(html)<16*1024*1024);
fs.writeFileSync('docs/app/config.json',configText);
fs.writeFileSync('docs/app/index.html',html);
console.log(JSON.stringify({ok:true,revision,sha256,races:7,horses:count,configBytes:configBytes.length,appBytes:Buffer.byteLength(html),preservedHistoricalDays:Object.keys(historic.camarero||{}).length,paths:['docs/app/config.json','docs/app/index.html']}));
