'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),expanded=path.resolve(process.argv[2]||path.join(root,'.v131/PlayersHype-Ecosystem-V1.3.1-RC'));
const assets=path.join(expanded,'shared/src/main/assets');
const html=fs.readFileSync(path.join(expanded,'app-admin/src/main/assets/hypepredict/admin.html'),'utf8');
const snapshot=html.match(/data-snapshot-id=["']([a-zA-Z0-9_-]+)["']/)?.[1];assert(snapshot,'Packaged Admin snapshot is required for this regression');
const card=JSON.parse(fs.readFileSync(path.join(root,'docs/app/imports/camarero-2026-11-05.card.json'),'utf8'));
const config=JSON.parse(fs.readFileSync(path.join(root,'docs/app/config.json'),'utf8'));
const registry=config.tracks;
const storage=new Map([
 ['hypepredict.cardLibrary.v1','[]'],
 ['hypepredict.trackRegistry.v1','[]'],
 ['hypepredict.cardLibrary.v1.snapshot.'+snapshot,JSON.stringify([card])],
 ['hypepredict.trackRegistry.v1.snapshot.'+snapshot,JSON.stringify(registry)]
]);
const context={window:{},localStorage:{getItem:key=>storage.get(key)||null}};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(assets,'native/live-publish.js'),'utf8'),context);
const workspace=context.window.HypeLive.workspace();
assert.equal(workspace.cards.length,1);assert.equal(workspace.cards[0].races.length,7);
assert.equal(workspace.cards[0].races.reduce((n,r)=>n+r.horses.length,0),40);
assert.equal(JSON.stringify(workspace.tracks),JSON.stringify(registry));
vm.runInContext(fs.readFileSync(path.join(assets,'sync/publication.js'),'utf8'),context);
const merged=context.window.PHPublication.mergeCards(config,workspace.cards,workspace.tracks);
for(const race of card.races){
 const analysis=merged.hypepredict.analyses['camarero-2026-11-05-r'+race.raceNumber];assert(analysis);
 for(const horse of race.horses){const actual=analysis.horses.find(h=>Number(h.programNumber)===Number(horse.programNumber));assert(actual);assert.equal(actual.hypeScore,horse.model.hypeScore);}
}
console.log('PASS actual packaged publisher reads the editor snapshot, ignores empty legacy storage, and projects 7 races / 40 unchanged scores');
