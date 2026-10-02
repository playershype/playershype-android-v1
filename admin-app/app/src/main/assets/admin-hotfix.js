(function(){
'use strict';
if(typeof validateCandidate!=='function')return;

const _applyParsed=applyParsed;
const _baseValidate=validateCandidate;
function clean(v){return String(v==null?'':v).replace(/\r/g,'').trim()}
function normalizeReportText(v){return String(v==null?'':v).replace(/\uFEFF|\u200B|\u200C|\u200D/g,'').replace(/\u00A0/g,' ').replace(/\r\n?/g,'\n').replace(/^\s*Worked for\s+\d+(?:m\s*)?\d*\s*s\s*$/gim,'').replace(/[ \t]+\n/g,'\n').replace(/\n{4,}/g,'\n\n\n').trim()}
function erx(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function field(block,label,next){
  const stop=(next||['HypeScore','Confiabilidad','Peso','Jinete','Entrenador','Establo/propietario','Uniforme','Últimas cinco','Días sin correr','Briseos disponibles','Perfil','Power/Rating','Distancia','Value','LECTURA','USO']).filter(x=>x!==label).map(erx).join('|');
  const rx=new RegExp(erx(label)+'\\s*:\\s*([\\s\\S]*?)'+(stop?'(?=\\s+(?:'+stop+')\\s*:|$)':'$'),'i');
  const m=rx.exec(block);return m?clean(m[1]):'';
}
function headerValue(text,label,nextLabels){
  const next=(nextLabels||[]).map(erx).join('|');
  const rx=new RegExp(erx(label)+'\\s*:\\s*([\\s\\S]*?)'+(next?'(?=\\s+(?:'+next+')\\s*:|$)':'$'),'i');
  const m=rx.exec(text);return m?clean(m[1]):'';
}
function section(text,start,end){
  const sm=new RegExp(start,'i').exec(text);if(!sm)return '';
  const from=sm.index+sm[0].length;
  const em=end?new RegExp(end,'i').exec(text.slice(from)):null;
  return clean(text.slice(from,em?from+em.index:text.length));
}
function num(v){const m=String(v||'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null}
function listNumbers(v){const out=[];let m;const r=/#?\s*(\d{1,2})\b/g;while((m=r.exec(String(v||'')))){const n=+m[1];if(n>0&&!out.includes(n))out.push(n)}return out}
function reportMeta(text){
  const retirementsText=headerValue(text,'Retiros confirmados',['Cambios oficiales','Condición oficial de pista','Track Bias confirmado']);
  const retirements=[]; let m; const rx=/R(\d{1,2})\s*#(\d{1,2})\s+([^;\n]+)/gi;
  while((m=rx.exec(retirementsText)))retirements.push({race:+m[1],programNumber:+m[2],name:clean(m[3])});
  return {
    pick6:headerValue(text,'Pick 6 oficial',['Unidad oficial Pick 6','Retiros confirmados']),
    pick6Unit:headerValue(text,'Unidad oficial Pick 6',['Retiros confirmados','Cambios oficiales']),
    retirements,retirementsText,
    officialChanges:headerValue(text,'Cambios oficiales',['Condición oficial de pista']),
    trackCondition:headerValue(text,'Condición oficial de pista',['Track Bias confirmado']),
    trackBias:headerValue(text,'Track Bias confirmado',[])
  };
}
function raceStarts(text){
  const out=[];
  const strong=/(?:^|\n|\s)(R\s*(\d{1,2})\s*[—–:-]\s*(?:(?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[EÉ]PTIMA|OCTAVA|NOVENA|D[EÉ]CIMA|UND[EÉ]CIMA|DUOD[EÉ]CIMA)\s+CARRERA|CARRERA|RACE)\b)/giu;
  let m;
  while((m=strong.exec(text))){const n=+m[2],start=m.index+m[0].lastIndexOf(m[1]);if(n>0&&n<30&&!out.some(x=>x.n===n))out.push({n,start});}
  if(!out.length){
    const lines=text.split(/\n/);let pos=0;
    for(const line of lines){
      const x=line.match(/^\s*(?:[#>*_\-]+\s*)?R\s*(\d{1,2})\s*(?:[—–:\-|]|\s)+(.*)$/i);
      if(x&&/CARRERA|RACE|\b\d{3,4}\s*M\b|MILLAS?|FURLONG/i.test(x[2])){const n=+x[1];if(n>0&&n<30&&!out.some(y=>y.n===n))out.push({n,start:pos});}
      pos+=line.length+1;
    }
  }
  return out.sort((a,b)=>a.start-b.start);
}
function checklistBlocks(sectionText){
  const hits=[];let m;
  const marker=/#(\d{1,2})\s+(.+?)\s+[—–-]\s+(.+?)\s+HypeScore\s*:/gi;
  while((m=marker.exec(sectionText))){const n=+m[1];if(!hits.some(x=>x.n===n))hits.push({n,name:clean(m[2]),role:clean(m[3]),start:m.index});}
  if(!hits.length){
    const legacy=/^(?:\s*)#(\d{1,2})\s+([^\n]+?)\s+[—–-]\s+([^\n]+)$/gim;
    while((m=legacy.exec(sectionText))){const after=sectionText.slice(legacy.lastIndex,Math.min(sectionText.length,legacy.lastIndex+600));if(/HypeScore\s*:/i.test(after)&&/Confiabilidad\s*:/i.test(after)){const n=+m[1];if(!hits.some(x=>x.n===n))hits.push({n,name:clean(m[2]),role:clean(m[3]),start:m.index});}}
  }
  hits.sort((a,b)=>a.start-b.start);
  return hits.map((h,i)=>{
    const end=i+1<hits.length?hits[i+1].start:sectionText.length;
    const raw=sectionText.slice(h.start,end).trim();
    const hs=(raw.match(/HypeScore\s*:\s*(\d+(?:\.\d+)?)/i)||[])[1];
    return {programNumber:h.n,name:h.name,role:h.role,hypeScore:hs==null?null:+hs,reliability:field(raw,'Confiabilidad'),raw};
  });
}
function boardRows(sectionText){
  const area=section(sectionText,'(?:🏆\\s*)?HYPEBOARD','(?:🐺\\s*)?CHECKLIST|(?:⚖️\\s*)?CONTROL DE RIESGO');
  const rows=[];let m;const rx=/(?:^|\n)\s*(\d+)[.)]\s*#(\d{1,2})\s+(.+?)\s+[—–-]\s+(\d+(?:\.\d+)?)(?:\s+(⭐+))?/gim;
  while((m=rx.exec(area)))rows.push({rank:+m[1],programNumber:+m[2],name:clean(m[3]),role:'',hypeScore:+m[4],reliability:clean(m[5]||''),raw:m[0].trim()});
  return rows;
}
function quickRef(area,label,entries){
  const r=new RegExp(erx(label)+'\\s*:\\s*#(\\d{1,2})\\s+(.+?)\\s+[—–-]\\s*(\\d+(?:\\.\\d+)?)','i').exec(area);
  if(!r)return null;const e=entries.find(x=>x.programNumber===+r[1]);return {entryId:e?e.id:null,programNumber:+r[1],name:clean(r[2]),hypeScore:+r[3]};
}
function quickHits(sectionText,entries){
  const area=section(sectionText,'(?:⚡\\s*)?QUICK HITS','(?:⚡\\s*)?PACE PROJECTION');
  return {
    select:quickRef(area,'Select',entries),rival:quickRef(area,'Rival',entries),sleeper:quickRef(area,'Tapada',entries),valuePlay:quickRef(area,'Huevazo',entries),
    value:headerValue(area,'Value Play',['Riesgo','Confianza Select','Confiabilidad Select','Gap','Estado Pool','DECISIÓN','Razón de decisión']),
    risk:headerValue(area,'Riesgo',['Confianza Select','Confiabilidad Select','Gap','Estado Pool','DECISIÓN','Razón de decisión']),
    selectConfidence:headerValue(area,'Confianza Select',['Confiabilidad Select','Gap','Estado Pool','DECISIÓN','Razón de decisión']),
    selectReliability:headerValue(area,'Confiabilidad Select',['Gap','Estado Pool','DECISIÓN','Razón de decisión']),
    gap:headerValue(area,'Gap',['Estado Pool','DECISIÓN','Razón de decisión']),
    poolStatus:headerValue(area,'Estado Pool',['DECISIÓN','Razón de decisión']),
    decision:headerValue(area,'DECISIÓN',['Razón de decisión']),
    decisionReason:headerValue(area,'Razón de decisión',[])
  };
}
function horseProfile(h){
  const b=h.raw;
  return {
    name:h.name,programNumber:h.programNumber,role:h.role||'',reliability:h.reliability||'',
    weight:field(b,'Peso'),jockey:field(b,'Jinete'),trainer:field(b,'Entrenador'),
    owner:field(b,'Establo/propietario'),uniform:field(b,'Uniforme'),lastFive:field(b,'Últimas cinco'),
    daysSinceRace:field(b,'Días sin correr'),workouts:field(b,'Briseos disponibles'),paceProfile:field(b,'Perfil'),
    powerRating:field(b,'Power/Rating'),distance:field(b,'Distancia'),value:field(b,'Value'),
    reading:field(b,'LECTURA',['USO']),use:field(b,'USO',['CONTROL DE RIESGO','POOL INTELLIGENCE','HYPEBET','CONCLUSIÓN DE JORNADA','HYPEPICK 6','VEREDICTO FINAL'])
  };
}
function raceMeta(sectionText){
  const first=clean(sectionText.split(/\n/)[0]);const m=first.match(/^R\s*(\d{1,2})\s*[—–:-]\s*(.*)$/i),title=m?clean(m[2]):'';
  const d=title.match(/\b(\d{3,4})\s*M\b/i),parts=title.split(/\s*\|\s*/).map(clean).filter(Boolean);
  const q=(new RegExp('(?:⚡\\s*)?QUICK HITS','i').exec(sectionText)||{index:sectionText.length}).index,area=sectionText.slice(0,q);
  return {title,distance:d?d[1]+' M':'',surface:parts.length>1?parts[1]:'',raceType:parts.length>2?parts.slice(2).join(' | '):'',condition:headerValue(area,'Condición',['Reclamo','Premio','Superficie','Participantes','Race Rating']),claiming:headerValue(area,'Reclamo',['Premio','Superficie','Participantes','Race Rating']),purse:headerValue(area,'Premio',['Superficie','Participantes','Race Rating']),officialSurface:headerValue(area,'Superficie',['Participantes','Race Rating']),participants:num(headerValue(area,'Participantes',['Race Rating'])),raceRating:num(headerValue(area,'Race Rating',[]))};
}
function paceProjection(sectionText,entries){
  const area=section(sectionText,'(?:⚡\\s*)?PACE PROJECTION','(?:🧠\\s*)?LECTURA GENERAL|(?:🏆\\s*)?HYPEBOARD');if(!area)return null;
  const labels=['Speed','Presser','Stalker','Closer','ESCENARIO'],out={};
  for(let i=0;i<4;i++){const v=headerValue(area,labels[i],labels.slice(i+1)),nums=/NINGUNO|NONE/i.test(v)?[]:listNumbers(v);out[labels[i].toLowerCase()]=nums.map(n=>{const e=entries.find(x=>x.programNumber===n);return {entryId:e?e.id:null,programNumber:n,name:e?e.name:''}});}
  out.scenario=headerValue(area,'ESCENARIO',[]);return out;
}
function riskControl(sectionText){const a=section(sectionText,'(?:⚖️\\s*)?CONTROL DE RIESGO','(?:🎯\\s*)?POOL INTELLIGENCE');if(!a)return null;return {gap:headerValue(a,'Gap Select vs Rival',['Decisión','Confiabilidad Select','Riesgo','Factores de riesgo']),decision:headerValue(a,'Decisión',['Confiabilidad Select','Riesgo','Factores de riesgo']),selectReliability:headerValue(a,'Confiabilidad Select',['Riesgo','Factores de riesgo']),risk:headerValue(a,'Riesgo',['Factores de riesgo']),factors:headerValue(a,'Factores de riesgo',[])};}
function poolIntelligence(sectionText){const a=section(sectionText,'(?:🎯\\s*)?POOL INTELLIGENCE','(?:🎯\\s*)?HYPEBET|───|CONCLUSIÓN DE JORNADA');if(!a)return null;return {fixed:headerValue(a,'Fijo',['Base','Defensa','Cobertura','Primer corte','Outsider','Estrategia Pool','CORTE DE PRESUPUESTO']),base:headerValue(a,'Base',['Defensa','Cobertura','Primer corte','Outsider','Estrategia Pool','CORTE DE PRESUPUESTO']),defense:headerValue(a,'Defensa',['Cobertura','Primer corte','Outsider','Estrategia Pool','CORTE DE PRESUPUESTO']),coverage:headerValue(a,'Cobertura',['Primer corte','Outsider','Estrategia Pool','CORTE DE PRESUPUESTO']),firstCut:headerValue(a,'Primer corte',['Outsider','Estrategia Pool','CORTE DE PRESUPUESTO']),outsider:headerValue(a,'Outsider',['Estrategia Pool','CORTE DE PRESUPUESTO']),strategy:headerValue(a,'Estrategia Pool',['CORTE DE PRESUPUESTO']),budgetCut:headerValue(a,'CORTE DE PRESUPUESTO',[])};}
function hypeBet(sectionText){const a=section(sectionText,'(?:🎯\\s*)?HYPEBET','───|CONCLUSIÓN DE JORNADA');return a?headerValue(a,'HypeBet',[]):''}
function ticketBlocks(area){const out=[];let m;const re=/EL\s+(DIRECTO|SELECT|CRASHER|BANGER)\b([\s\S]*?)(?=EL\s+(?:DIRECTO|SELECT|CRASHER|BANGER)\b|$)/gi;while((m=re.exec(area))){const body=clean(m[2]),legs={};let x;const lr=/R(\d{1,2})\s*:\s*([0-9,\s]+?)(?=\s+R\d{1,2}\s*:|\s+Combinaciones\s*:|\s+Unidad\s*:|\s+Costo total\s*:|$)/gi;while((x=lr.exec(body)))legs['R'+x[1]]=clean(x[2]).replace(/\s+/g,'');out.push({name:m[1].toUpperCase(),legs,combinations:num(headerValue(body,'Combinaciones',['Unidad','Costo total'])),unit:headerValue(body,'Unidad',['Costo total']),totalCost:headerValue(body,'Costo total',[])})}return out;}
function globalSemantic(text){
  const conclusion=section(text,'CONCLUSIÓN DE JORNADA','(?:🐺\\s*)?HYPEPICK 6|(?:🎯\\s*)?VEREDICTO FINAL HYPEPREDICT');
  const hp=section(text,'(?:🐺\\s*)?HYPEPICK 6(?:\\s*V[0-9.]+)?','(?:🎯\\s*)?VEREDICTO FINAL HYPEPREDICT');
  const verdict=section(text,'(?:🎯\\s*)?VEREDICTO FINAL HYPEPREDICT',null);
  return {dashboardContract:'HYPEPREDICT-V1-DASHBOARD-SEMANTIC',parserVersion:'v0.1-semantic-2026-10-01',conclusionRaw:conclusion,conclusion:{fixed:headerValue(conclusion,'Fijo Estratégico',['Base más sólida de la jornada','Carrera de mayor incertidumbre','Carrera más profunda por calidad','Carrera con mejor oportunidad de Value']),strongestBase:headerValue(conclusion,'Base más sólida de la jornada',['Carrera de mayor incertidumbre','Carrera más profunda por calidad','Carrera con mejor oportunidad de Value']),highestUncertainty:headerValue(conclusion,'Carrera de mayor incertidumbre',['Carrera más profunda por calidad','Carrera con mejor oportunidad de Value']),deepestRace:headerValue(conclusion,'Carrera más profunda por calidad',['Carrera con mejor oportunidad de Value']),bestValue:headerValue(conclusion,'Carrera con mejor oportunidad de Value',[])},hypePick6:hp?{range:headerValue(hp,'Rango oficial',['Unidad oficial']),unit:headerValue(hp,'Unidad oficial',['EL DIRECTO','EL SELECT','EL CRASHER','EL BANGER']),tickets:ticketBlocks(hp)}:null,finalVerdictRaw:verdict,finalVerdict:verdict?{fixed:headerValue(verdict,'Fijo Estratégico de la jornada',['Base más sólida','Carrera de mayor riesgo','Carrera para abrir','Principal amenaza de presupuesto','Veredicto']),strongestBase:headerValue(verdict,'Base más sólida',['Carrera de mayor riesgo','Carrera para abrir','Principal amenaza de presupuesto','Veredicto']),highestRisk:headerValue(verdict,'Carrera de mayor riesgo',['Carrera para abrir','Principal amenaza de presupuesto','Veredicto']),openRace:headerValue(verdict,'Carrera para abrir',['Principal amenaza de presupuesto','Veredicto']),budgetThreat:headerValue(verdict,'Principal amenaza de presupuesto',['Veredicto']),text:headerValue(verdict,'Veredicto',[])}:null};
}

parseTextReport=function(text){
  text=normalizeReportText(text);
  const track=trackFromText(text),date=dateFromText(text),starts=raceStarts(text);
  if(!starts.length){if(/PROMPT MAESTRO|Lead Product Designer|Data Parser Architect|QA OBLIGATORIO/i.test(text))throw new Error('Ese texto es el contrato del Dashboard, no una jornada. Pega el análisis HypePredict sellado con carreras R#; el Admin usa estas reglas internamente.');throw new Error('No pude identificar carreras R# en el análisis. Pega el reporte HypePredict sellado, no instrucciones ni texto de chat.');}
  const declared=/Carreras\s+analizadas\s*:\s*R(\d{1,2})\s*[–—-]\s*R(\d{1,2})/i.exec(text),expected=declared?(+declared[2]-+declared[1]+1):starts.length;
  if(starts.length!==expected)throw new Error('El reporte declara '+expected+' carreras y el parser detectó '+starts.length+' encabezados de carrera.');
  const races=[],analyses={},horseData={};
  const conclusionIndex=(/CONCLUSIÓN DE JORNADA/i.exec(text)||{index:text.length}).index;
  for(let i=0;i<starts.length;i++){
    const h=starts[i],naturalEnd=i+1<starts.length?starts[i+1].start:text.length,end=(i===starts.length-1?Math.min(naturalEnd,conclusionIndex):naturalEnd),sectionText=text.slice(h.start,end);
    let horses=checklistBlocks(sectionText);const board=boardRows(sectionText);if(!horses.length)horses=board;if(!horses.length)throw new Error('R'+h.n+': no pude recuperar el campo activo.');
    if(board.length){const map=new Map(horses.map(x=>[x.programNumber,x]));for(const b of board){const x=map.get(b.programNumber);if(x&&x.hypeScore==null)x.hypeScore=b.hypeScore;if(x&&!x.reliability&&b.reliability)x.reliability=b.reliability}}
    const declaredField=/Participantes\s*:\s*(\d+)/i.exec(sectionText);if(declaredField&&horses.length!==+declaredField[1])throw new Error('R'+h.n+': el reporte declara '+declaredField[1]+' participantes activos y el parser recuperó '+horses.length+'.');
    const rid=track.id+'-'+date+'-r'+h.n,entries=horses.map(x=>({id:rid+'-h'+x.programNumber,programNumber:x.programNumber,name:x.name}));races.push({id:rid,number:h.n,entries});
    const parsedHorses=horses.map(x=>{const entry=entries.find(e=>e.programNumber===x.programNumber),row={entryId:entry.id,programNumber:x.programNumber,name:x.name,role:x.role||'',hypeScore:x.hypeScore,reliability:x.reliability||'',sourceText:x.raw};horseData[entry.id]={entryId:entry.id,status:'published',profile:horseProfile(x),pps:[],sourceText:x.raw};return row;});
    if(parsedHorses.some(x=>!Number.isFinite(Number(x.hypeScore))))throw new Error('R'+h.n+': falta HypeScore público en uno o más ejemplares.');
    const boardOut=board.map(b=>{const e=entries.find(x=>x.programNumber===b.programNumber);return {rank:b.rank,entryId:e?e.id:null,programNumber:b.programNumber,name:b.name,hypeScore:b.hypeScore,reliability:b.reliability||''}});
    analyses[rid]={trackId:track.id,raceId:rid,status:'published',publicContract:'dashboard-safe-v3.0',horses:parsedHorses,quickHits:quickHits(sectionText,entries),raceMeta:raceMeta(sectionText),paceProjection:paceProjection(sectionText,entries),raceRead:section(sectionText,'(?:🧠\\s*)?LECTURA GENERAL\\s*:','(?:🏆\\s*)?HYPEBOARD'),hypeBoard:boardOut,riskControl:riskControl(sectionText),poolIntelligence:poolIntelligence(sectionText),hypeBet:hypeBet(sectionText),sourceText:sectionText.trim()};
  }
  races.sort((a,b)=>a.number-b.number);const meta=Object.assign(reportMeta(text),globalSemantic(text));
  for(const x of meta.retirements){const race=races.find(r=>r.number===x.race);if(race&&race.entries.some(e=>e.programNumber===x.programNumber))throw new Error('R'+x.race+' #'+x.programNumber+' figura como retirado y no puede quedar en el campo activo.');}
  return {track,date,races,analyses,horseData,raw:text,reportMeta:meta};
};

applyParsed=function(p){
  _applyParsed(p);
  if(!p||p.candidate||!p.reportMeta)return;
  draft.latestReport=Object.assign({},draft.latestReport||{},p.reportMeta,{trackId:p.track.id,date:p.date,rawReport:p.raw,source:'admin-auto-parser',processedAt:new Date().toISOString()});persist();readyCandidate=buildCandidate();const errors=validateCandidate(readyCandidate);if(errors.length)throw new Error(errors[0]);renderReady(p.track.id,p.date,p.races,p.analyses);
};

validateCandidate=function(c){
  let baseErrors=[];
  try{
    const shadow=JSON.parse(JSON.stringify(c));
    const aa=shadow&&shadow.hypepredict&&shadow.hypepredict.analyses||{};
    for(const a of Object.values(aa))if(a&&a.status==='published'&&a.publicContract==='dashboard-safe-v3.0'){for(const h of a.horses||[])if(!h.scores||!Object.keys(h.scores).length)delete h.scores;a.status='dashboard-safe';}
    baseErrors=_baseValidate(shadow)||[];
  }catch(e){baseErrors=[e.message||String(e)];}
  const errors=baseErrors.filter(x=>!/Faltan los 9 factores|HypeScore no cuadra/i.test(String(x)));
  for(const t of c&&c.tracks||[]){const d=c.raceDays&&c.raceDays[t.id];if(!d)continue;for(const r of d.races||[]){const a=c.hypepredict&&c.hypepredict.analyses&&c.hypepredict.analyses[r.id];if(!a)errors.push('Falta análisis R'+r.number);else if(a.status==='published'&&(!Array.isArray(a.horses)||a.horses.length!==r.entries.length))errors.push('Análisis publicado incompleto R'+r.number);const nums=new Set();for(const e of r.entries||[]){if(nums.has(e.programNumber))errors.push('Número duplicado R'+r.number+' #'+e.programNumber);nums.add(e.programNumber)}}}
  const analyses=c&&c.hypepredict&&c.hypepredict.analyses||{};for(const a of Object.values(analyses)){if(!a||a.status!=='published')continue;for(const h of a.horses||[]){if(!Number.isFinite(Number(h.hypeScore))||Number(h.hypeScore)<0||Number(h.hypeScore)>10)errors.push('HypeScore público inválido en '+(h.entryId||h.name||'ejemplar'));}}
  return Array.from(new Set(errors));
};
})();
