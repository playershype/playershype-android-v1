const assert=require('node:assert/strict');
const fs=require('node:fs');
const H=require('../app/src/main/assets/race-history.js');
const config=JSON.parse(fs.readFileSync('docs/app/config.json','utf8'));
const legacy=JSON.parse(fs.readFileSync('app/src/main/assets/history/2026-10-05/parx-racing.json','utf8'));
H.addLegacy(legacy);
const original=JSON.stringify(config);
let snapshots=0,races=0;
for(const [track,history] of Object.entries(config.raceDayHistory||{}))for(const [date,s] of Object.entries(history)){
 const resolved=H.resolve(config,track,date);assert.ok(resolved,track+' '+date);
 assert.deepEqual(resolved.day,s.day);assert.deepEqual(resolved.analyses,s.analyses);assert.deepEqual(resolved.horseData,s.horseData);
 const view=H.forDate(config,date);assert.deepEqual(view.raceDays[track],s.day);
 for(const [id,a] of Object.entries(s.analyses)){assert.deepEqual(view.hypepredict.analyses[id],a);races++}
 assert.equal(resolved.report,null,'old archives lack original day report');snapshots++;
}
assert.deepEqual(H.resolve(config,'parx-racing','2026-10-05').day,legacy.raceDays['parx-racing']);
assert.equal(H.select(config,'1999-01-01','camarero').date,'1999-01-01');
assert.deepEqual(H.forDate(config,'1999-01-01').tracks,[]);
assert.equal(H.select(config,'2026-10-16','nonexistent').track,'nonexistent');
assert.ok(H.forDate(config,'2026-10-16').tracks.some(t=>t.id==='belmont'));
assert.ok(H.forDate(config,'2026-10-16').tracks.some(t=>t.id==='gulfstream'));
assert.ok(H.tracks(config).some(t=>t.id==='keeneland'),'recover day-backed track absent from registry');
const fixture={
 tracks:[{id:'test',name:'Test'}],
 raceDays:{test:{date:'2026-10-18',status:'scheduled',races:[{id:'r1',number:1,entries:[{id:'h1'}]}]}},
 hypepredict:{analyses:{r1:{trackId:'test',raceId:'r1',status:'published',horses:[{entryId:'h1',name:'TODAY'}]}},latestReport:{trackId:'test',date:'2026-10-18',rawReport:'TODAY'}},
 horseData:{h1:{profile:{name:'TODAY'}}},
 raceDayHistory:{test:{'2026-10-17':{
   day:{date:'2026-10-17',status:'scheduled',races:[{id:'r1',number:1,entries:[{id:'h1'}]}]},
   analyses:{r1:{trackId:'test',raceId:'r1',status:'published',horses:[{entryId:'h1',name:'ORIGINAL',hypeScore:7.1}]}},
   horseData:{h1:{profile:{name:'ORIGINAL'}}}
 }}}
};
let v=H.forDate(fixture,'2026-10-17');assert.equal(v.hypepredict.analyses.r1.horses[0].name,'ORIGINAL');assert.equal(v.horseData.h1.profile.name,'ORIGINAL');assert.deepEqual(v.hypepredict.latestReport,{});
v.horseData.h1.profile.name='CHANGED';assert.equal(fixture.raceDayHistory.test['2026-10-17'].horseData.h1.profile.name,'ORIGINAL');
fixture.raceDayHistory.test['2026-10-17'].horseData={};assert.deepEqual(H.resolve(fixture,'test','2026-10-17').horseData,{});
fixture.raceDayHistory.test['2026-10-17'].analyses={};assert.deepEqual(H.resolve(fixture,'test','2026-10-17').analyses,{});assert.deepEqual(H.forDate(fixture,'2026-10-17').tracks,[]);
fixture.raceDayHistory.test['2026-10-18']={day:{date:'2026-10-16',races:[]}};assert.equal(H.resolve(fixture,'test','2026-10-18'),null);
assert.equal(JSON.stringify(config),original,'source config remains unchanged');
assert.equal(fs.readFileSync('app/src/main/assets/race-history.js','utf8'),fs.readFileSync('docs/hypepredict/race-history.js','utf8'),'Android/web share exact reader');
console.log(`PASS: ${snapshots} archived jornadas / ${races} original analyses, legacy Parx, exact dates, multi-track, missing evidence, collision isolation and immutability.`);
