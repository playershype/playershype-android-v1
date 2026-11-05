'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'android-sync/assets/publication.js'),'utf8'),context);
const api=context.window.PHPublication;
const card=JSON.parse(fs.readFileSync(path.join(root,'docs/app/imports/camarero-2026-11-05.card.json'),'utf8'));
const config=JSON.parse(fs.readFileSync(path.join(root,'docs/app/config.json'),'utf8'));
let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS',name)};
const clone=v=>JSON.parse(JSON.stringify(v));
check('A sealed card publishes while an unsealed card stays unchanged in the library',()=>{
 const draft=clone(card);draft.event.track='Draft fixture';draft.event.date='2026-11-03';draft.event.preRaceFrozen=false;
 const cards=[card,draft],original=JSON.stringify(cards),scope=api.publicationScope(cards),ready=api.prepareCards(cards);
 assert.equal(scope.ready.length,1);assert.equal(scope.pending.length,1);assert.equal(ready.length,1);
 assert(scope.summary.includes('2026-11-05')&&scope.summary.includes('2026-11-03'));
 assert.equal(JSON.stringify(cards),original);assert.equal(ready[0].races.length,7);
});
check('No implicit seal is invented and all-draft publication fails',()=>{
 const draft=clone(card);delete draft.event.preRaceFrozen;
 assert.throws(()=>api.prepareCards([draft]),/No hay jornadas selladas/);
 assert.equal(api.prepareCards([]).length,0);
});
function withPick6(){
 const c=clone(card),legs=[2,3,4,5,6,7],selections=Object.fromEntries(legs.map(n=>['R'+n,[c.races.find(r=>r.raceNumber===n).horses[0].programNumber]]));
 c.hypePick6={status:'available',poolLegs:legs,unit:.25};
 for(const name of ['direct','crasher','banger'])c.hypePick6[name]={legs:clone(selections),combinations:1,cost:{derivedBaseCost:.25}};
 return c;
}
check('Inconsistent HypePick numbers are withheld without changing the saved structures',()=>{
 const c=withPick6();c.hypePick6.direct.combinations=2;const before=JSON.stringify(c);
 const prepared=api.prepareCards([c]);assert.equal(prepared[0].hypePick6,undefined);
 assert.equal(JSON.stringify(c),before);assert.equal(api.publicationScope([c]).withheld.length,1);
});
check('Consistent HypePick structures pass unchanged; invalid costs or runners are withheld',()=>{
 const c=withPick6();assert.equal(JSON.stringify(api.prepareCards([c])[0].hypePick6),JSON.stringify(c.hypePick6));
 c.hypePick6.crasher.cost.derivedBaseCost=99;assert(api.pick6Issue(c));
 const other=withPick6();other.hypePick6.banger.legs.R2=[999];assert(api.pick6Issue(other));
});
check('Legacy longshot maps to Huevazo separately from Value Play with unchanged score',()=>{
 const c=clone(card),race=c.races[0],expected=race.quickHits.huevazo;
 assert(expected);race.quickHits.longshot=expected;delete race.quickHits.huevazo;race.quickHits.valuePlay=null;
 const merged=api.mergeCards(config,api.prepareCards([c]),config.tracks),q=merged.hypepredict.analyses['camarero-2026-11-05-r1'].quickHits;
 assert.equal(q.huevazo.programNumber,expected.horseNumber);assert.equal(q.valuePlay,null);
 const horse=race.horses.find(h=>Number(h.programNumber)===Number(expected.horseNumber));assert.equal(q.huevazo.hypeScore,horse.model.hypeScore);
});
const start=performance.now();for(let i=0;i<1000;i++)api.publicationScope([card]);console.log('SCOPE_PREVIEW_MS',((performance.now()-start)/1000).toFixed(4));
console.log('PASS',checks,'publication scope checks');
