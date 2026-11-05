'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx={};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/publication.js'),'utf8'),ctx);
const PHPublication=ctx.PHPublication;
const base=()=>({schemaVersion:2,revision:'test',tracks:[],home:{},hypepredict:{analyses:{}},raceDays:{},horseData:{},raceDayHistory:{}});
const role=['Select','Contendiente','Tapada','Huevazo','Campo'];
const numbers=[4,2,5,7,1],scores=[8.7,7.2,6.8,5.4,3.5];
const hs=numbers.map((n,i)=>({programNumber:n,name:'Caballo '+n,model:{hypeScore:scores[i],reliability:'⭐⭐⭐'},roles:{primary:role[i],recommendedUse:'Base'},connections:{jockey:'No disponible',trainer:'No disponible'},raceData:{weight:'118 lb'},form:{lastFiveDisplay:'No disponible',distanceRecord:'No disponible'},works:[],paceProfile:{display:'Stalker',primary:'Stalker'},reading:'Lectura comprobada'}));
const card=()=>({event:{track:'Test Track',date:'2026-11-05',preRaceFrozen:true,publicationProfile:'hypepredict-v2-15equal-ordinal-v1'},races:[{raceNumber:1,horses:hs.slice().reverse(),hypeBoard:numbers.map((n,i)=>({rank:i+1,horseNumber:n,hypeScore:scores[i],reliability:'⭐⭐⭐'})),quickHits:{select:{horseNumber:4},rival:{horseNumber:2},sleeper:{horseNumber:5},huevazo:{horseNumber:7},valuePlay:{horseNumber:1}},pace:{speed:[],pressers:[],stalkers:numbers.map(n=>({horseNumber:n})),closers:[],scenario:'Viaje proyectado'},distance:{display:'1200 m',value:1200},generalRead:'Lectura',decision:{gap:'+1.5',risk:{display:'Medio'}},poolIntelligence:{base:[{horseNumber:4}]},hypeBet:'No aplica'}]});
let doc=PHPublication.mergeCards(base(),[card()],[]);
let a=doc.hypepredict.analyses['test-track-2026-11-05-r1'];
assert(a,'Carrera publicada');
assert.deepEqual(Array.from(a.horses,h=>h.programNumber),numbers);
assert.deepEqual(Array.from(a.hypeBoard,h=>h.programNumber),numbers);
assert.equal(a.quickHits.select.programNumber,4);
assert.equal(a.quickHits.rival.programNumber,2);
assert.equal(a.quickHits.sleeper.programNumber,5);
assert.equal(a.quickHits.huevazo.programNumber,7);
assert.equal(a.quickHits.valuePlay.programNumber,1);
assert(a.quickHits.huevazo.programNumber!==a.quickHits.valuePlay.programNumber);
console.log('PASS canonical board and 4 independent ordinal roles');
{
 const invalid=card();invalid.races[0].horses[3].model.hypeScore=null;
 assert.throws(()=>PHPublication.mergeCards(base(),[invalid],[]),/HypeScore/);
 console.log('PASS missing score is rejected');
}
{
 const invalid=card();invalid.races[0].quickHits.huevazo={horseNumber:1};
 assert.throws(()=>PHPublication.mergeCards(base(),[invalid],[]),/ordinales/);
 console.log('PASS 4th-rank Huevazo mismatch rejected');
}
{
 const invalid=card();invalid.event.preRaceFrozen=false;
 assert.throws(()=>PHPublication.mergeCards(base(),[invalid],[]),/preRaceFrozen/);
 console.log('PASS false pre-race seal rejected');
}
{
 const old=card();delete old.event.publicationProfile;old.races[0].quickHits.sleeper={horseNumber:7};delete old.races[0].quickHits.huevazo;
 const legacy=PHPublication.mergeCards(base(),[old],[]);
 assert(legacy.hypepredict.analyses['test-track-2026-11-05-r1']);
 console.log('PASS legacy card not silently relabeled');
}
