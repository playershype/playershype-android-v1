/* Public data adapter. It copies published scores; it never runs the scoring engine. */
(function(root){'use strict';
const clone=v=>JSON.parse(JSON.stringify(v)),id=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function validate(c){
 if(!c||c.schemaVersion!==2||!Array.isArray(c.tracks)||!c.home||!c.hypepredict||!c.raceDays)throw Error('Configuración pública V2 incompleta');
 if(JSON.stringify(c).length>24*1024*1024)throw Error('La publicación excede 24 MB');
 function inspect(v,path='',depth=0){if(depth>28)throw Error('Estructura demasiado profunda');if(typeof v==='string'&&(/<\/?(?:script|iframe|object)\b|javascript:/i.test(v)))throw Error('Contenido ejecutable bloqueado');if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){if(/token|password|secret|authorization|promptMaestro|hypeScoreWeights|postRaceCalibration|operationalNotes|rawSources|baseScore|tacticalAdjustment/i.test(k))throw Error('Campo privado bloqueado: '+k);inspect(x,path+'.'+k,depth+1)}}
 inspect(c);return clone(c);
}
function reliability(v){return typeof v==='string'?v:(v?.display||'⭐'.repeat(Number(v?.rating)||0))}
function display(v){return typeof v==='string'?v:(v==null?'':JSON.stringify(v))}
function pick6Issue(card){
 const p=card.hypePick6;if(!p||p.status!=='available')return '';
 const legs=p.poolLegs||card.event?.poolLegs;
 if(!Array.isArray(legs)||legs.length!==6||new Set(legs.map(Number)).size!==6)return 'Tramos incompletos';
 for(const name of ['direct','crasher','banger']){
  const ticket=p[name];let combinations=1;
  if(!ticket?.legs)return 'Estructura incompleta';
  for(const leg of legs){
   const choices=ticket.legs['R'+leg],race=card.races?.find(r=>Number(r.raceNumber)===Number(leg));
   if(!Array.isArray(choices)||!choices.length||new Set(choices.map(String)).size!==choices.length||!race)return 'Tramos incompatibles';
   if(choices.some(n=>!race.horses?.some(h=>String(h.programNumber)===String(n))))return 'Ejemplar ajeno al tramo';
   combinations*=choices.length;
  }
  if(Number(ticket.combinations)!==combinations)return 'Combinaciones inconsistentes';
  if(p.unit!=null){
   const unit=Number(p.unit);if(!Number.isFinite(unit)||unit<=0)return 'Unidad no verificada';
   for(const key of ['derivedBaseCost','sourceStatedMathematicalCost','publishedCost']){
    const value=ticket.cost?.[key];if(value!=null&&(!Number.isFinite(Number(value))||Math.abs(Number(value)-combinations*unit)>0.005))return 'Costo matemático inconsistente';
   }
  }
 }
 return '';
}
function publicationScope(cards){
 const list=Array.isArray(cards)?cards:[],ready=list.filter(c=>c?.event?.preRaceFrozen===true),pending=list.filter(c=>c?.event?.preRaceFrozen!==true);
 const label=c=>(c?.event?.track||'Hipódromo sin identificar')+' · '+(c?.event?.date||'Sin fecha')+' · '+(c?.races?.length||0)+' carreras';
 const withheld=ready.filter(c=>pick6Issue(c));
 const summary=(ready.length?'Listas para publicar: '+ready.map(label).join('; '):'Sin jornadas selladas para publicar.')+(pending.length?' | Se conservan en borrador: '+pending.map(label).join('; '):'')+(withheld.length?' | HypePick 6 pendiente de validar en '+withheld.length+' jornada(s); no se enviará.':'');
 return {ready,pending,withheld,summary};
}
function prepareCards(cards){
 const scope=publicationScope(cards);
 if(Array.isArray(cards)&&cards.length&&!scope.ready.length)throw Error('No hay jornadas selladas para publicar. La biblioteca local se conserva.');
 return scope.ready.map(card=>{const copy=clone(card);if(pick6Issue(card))delete copy.hypePick6;return copy});
}
function mergeCards(config,cards,tracks){
 const c=validate(config);c.horseData=c.horseData||{};c.hypepredict.analyses=c.hypepredict.analyses||{};c.raceDayHistory=c.raceDayHistory||{};
 for(const card of cards||[]){
  if(!card.event||!/^\d{4}-\d{2}-\d{2}$/.test(card.event.date)||!Array.isArray(card.races))throw Error('Jornada incompatible');
  const e=card.event,strictV2=e.publicationProfile==='hypepredict-v2-15equal-ordinal-v1',registry=(tracks||[]).find(t=>t.name===e.track||t.id===e.track||t.aliases?.includes(e.track));
  let track=c.tracks.find(t=>t.id===registry?.id||t.name===e.track||t.id===e.track);
  if(!track){track={id:registry?.id||id(e.track),name:registry?.name||e.track,status:'ready',races:0};c.tracks.push(track)}
  const tid=track.id,date=e.date,day={date,status:'published',races:[]};
  for(const r of card.races){
   const number=Number(r.raceNumber);if(!Number.isInteger(number)||number<1||number>99||!Array.isArray(r.horses))throw Error('Carrera incompatible');
   const rid=tid+'-'+date+'-r'+number,decision=r.decision||{},meta=r.distance||{};
    const ranked=(r.hypeBoard||[]).slice().sort((x,y)=>Number(x.rank)-Number(y.rank));
    if(strictV2){
     if(e.preRaceFrozen!==true)throw Error('Falta indicador preRaceFrozen:true (la verificación temporal es externa): R'+number);
     if(!Array.isArray(r.hypeBoard)||ranked.length!==r.horses.length||ranked.length<4)throw Error('HypeBoard incompleto: R'+number);
     const byNumber=new Map(r.horses.map(h=>[String(h.programNumber),h]));
     if(byNumber.size!==r.horses.length)throw Error('Números de programa duplicados: R'+number);
     const roles=['Select','Contendiente','Tapada','Huevazo'],keys=['select','rival','sleeper','huevazo'];
     ranked.forEach((b,i)=>{
      const h=byNumber.get(String(b.horseNumber)),score=h?.model?.hypeScore;
      if(b.rank!==i+1||!h)throw Error('Ranking incompleto o inconsistente: R'+number);
      if(typeof score!=='number'||!Number.isFinite(score)||score<0||score>10||Math.abs(score*10-Math.round(score*10))>1e-8)throw Error('HypeScore faltante o no publicado a 1 decimal: R'+number+' #'+b.horseNumber);
      if(Number(b.hypeScore)!==score)throw Error('HypeScore distinto entre caballo y HypeBoard: R'+number+' #'+b.horseNumber);
      if(i&&score>Number(ranked[i-1].hypeScore))throw Error('HypeBoard fuera de orden: R'+number);
      if(i<4&&(h.roles?.primary!==roles[i]||String(r.quickHits?.[keys[i]]?.horseNumber)!==String(b.horseNumber)))throw Error('Roles ordinales incompatibles: R'+number+' '+roles[i]);
     });
    }
   const horses=r.horses.map(h=>{
    const n=h.programNumber,hid=rid+'-h'+n,score=h.model?.hypeScore;
    if(score!=null&&(!Number.isFinite(Number(score))||Number(score)<0||Number(score)>10))throw Error('HypeScore inválido');
    const con=h.connections||{},data=h.raceData||{},form=h.form||{},rel=reliability(h.model?.reliability);
    const source=['#'+n+' '+h.name+' — '+display(h.roles?.primary),'HypeScore: '+(score??'No disponible'),'Confiabilidad: '+rel,'Peso: '+(data.weight??'No disponible'),'Jinete: '+(con.jockey||'No disponible'),'Entrenador: '+(con.trainer||'No disponible'),'Establo/propietario: '+(con.stable||con.owner||'No disponible'),'Uniforme: '+(h.silks?.description||'No disponible'),'Últimas cinco: '+(form.lastFiveDisplay||'No disponible'),'Días sin correr: '+(data.daysSinceLastRace??'No disponible'),'Briseos disponibles: '+(h.works||[]).map(w=>w.raw||display(w)).join('; '),'Perfil: '+display(h.paceProfile?.display||h.paceProfile?.primary),'Power/Rating: '+(data.powerNumber??'No disponible'),'Distancia: '+display(form.distanceRecord),'Value: '+display(h.value?.gradeDisplay||h.value?.comment),'LECTURA:',h.reading||'','USO:',display(h.roles?.recommendedUse)].join('\n');
    return {entryId:hid,programNumber:n,name:h.name,role:h.roles?.primary||'',hypeScore:score??null,reliability:rel,sourceText:source};
   });
   const publishedHorses=strictV2?ranked.map(b=>horses.find(h=>String(h.programNumber)===String(b.horseNumber))):horses;
    const ref=x=>{const h=horses.find(h=>String(h.programNumber)===String(x?.horseNumber)||h.entryId===x?.horseId);return h?{entryId:h.entryId,programNumber:h.programNumber,name:h.name,hypeScore:h.hypeScore}:null};
   const refs=a=>(a||[]).map(ref).filter(Boolean),q=r.quickHits||{},pace=r.pace||{},risk=decision.risk||{};
   const a={trackId:tid,raceId:rid,status:'published',publicContract:'dashboard-safe-v3.0',horses:publishedHorses,
    quickHits:{select:ref(q.select),rival:ref(q.rival),sleeper:ref(q.sleeper),huevazo:ref(q.huevazo||q.longshot),valuePlay:ref(q.valuePlay),value:display(q.value||'No cuantificable'),risk:risk.display||risk.level||'',selectConfidence:decision.selectConfidence||'',selectReliability:reliability(decision.selectReliability),gap:decision.gap??'',poolStatus:decision.poolStatus||'',decision:decision.sourceText||decision.officialDecision||'',decisionReason:decision.decisionExplanation||''},
    raceMeta:{title:meta.display||'Carrera '+number,distance:meta.display||display(meta.value),surface:r.surface||'',condition:r.conditionDisplayRaw||r.condition||'',claiming:display(r.claimingPrice),purse:display(r.purse),participants:horses.length},
    paceProjection:{speed:refs(pace.speed),presser:refs(pace.pressers),stalker:refs(pace.stalkers),closer:refs(pace.closers),scenario:pace.scenario||''},raceRead:r.generalRead||'',
    hypeBoard:ranked.map(b=>{const h=ref(b);return h?{...h,rank:b.rank,hypeScore:b.hypeScore,reliability:reliability(b.reliability)}:null}).filter(Boolean),
    riskControl:{decision:decision.officialDecision||'',risk:risk.display||risk.level||'',gap:decision.gap??'',selectReliability:reliability(decision.selectReliability),factors:decision.decisionExplanation||''},
    poolIntelligence:Object.fromEntries(['fixed','base','defense','coverage','firstCut','outsider','strategy','budgetCut'].map(key=>{const value=(r.poolIntelligence||{})[key==='outsider'?'outsiders':key];return [key,Array.isArray(value)?value.map(h=>h.horseNumber??h).join(','):display(value)]})),hypeBet:display(r.hypeBet),preRaceFrozen:e.preRaceFrozen===true};
   a.sourceText=['R'+number+' — '+a.raceMeta.title,a.raceMeta.condition,a.raceRead,'QUICK HITS',JSON.stringify(a.quickHits),'PACE PROJECTION',JSON.stringify(a.paceProjection),'HYPEBOARD',JSON.stringify(a.hypeBoard),'CHECKLIST',...publishedHorses.map(h=>h.sourceText),'CONTROL DE RIESGO',JSON.stringify(a.riskControl),'POOL INTELLIGENCE',JSON.stringify(a.poolIntelligence),'HYPEBET',a.hypeBet,'HYPEPICK 6',display(card.hypePick6),'CONCLUSIÓN / VEREDICTO',display(card.finalRead)].join('\n\n');
   c.hypepredict.analyses[rid]=a;day.races.push({id:rid,number,entries:publishedHorses.map(h=>({id:h.entryId,programNumber:h.programNumber,name:h.name}))});
   for(const h of publishedHorses)c.horseData[h.entryId]={entryId:h.entryId,status:'published',sourceText:h.sourceText,profile:{name:h.name,programNumber:h.programNumber,role:h.role,reliability:h.reliability,reading:h.sourceText}};
  }
  const old=c.raceDays[tid],prior=Array.isArray(old)?old:(Array.isArray(old?.days)?old.days:old?[old]:[]);
  let history=c.raceDayHistory[tid];if(!history||Array.isArray(history)){const previous=history||[];history=c.raceDayHistory[tid]={};for(const d of previous)if(d.date)history[d.date]={day:clone(d),analyses:{},horseData:{}}}
  for(const d of prior)if(d.date!==date&&!history[d.date])history[d.date]={day:clone(d),analyses:Object.fromEntries((d.races||[]).filter(r=>c.hypepredict.analyses[r.id]).map(r=>[r.id,c.hypepredict.analyses[r.id]])),horseData:Object.fromEntries((d.races||[]).flatMap(r=>(r.entries||[]).filter(h=>c.horseData[h.id]).map(h=>[h.id,c.horseData[h.id]])))};
  history[date]={day:clone(day),analyses:Object.fromEntries(day.races.map(r=>[r.id,c.hypepredict.analyses[r.id]])),horseData:Object.fromEntries(day.races.flatMap(r=>r.entries.map(h=>[h.id,c.horseData[h.id]])))};
  const days=new Map(prior.map(d=>[d.date,d]));for(const [key,value] of Object.entries(history))if(value?.day)days.set(key,value.day);days.set(date,day);
  c.raceDays[tid]={days:[...days.values()].sort((a,b)=>a.date.localeCompare(b.date))};
  track.races=c.raceDays[tid].days.at(-1)?.races?.length||0;
 }
 return validate(c);
}
root.PHPublication=Object.freeze({validate,mergeCards,clone,publicationScope,prepareCards,pick6Issue});
})(typeof window==='undefined'?globalThis:window);
