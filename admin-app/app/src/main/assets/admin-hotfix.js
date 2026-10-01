(function(){
'use strict';
if(typeof validateCandidate!=='function')return;

const _applyParsed=applyParsed;
function clean(v){return String(v==null?'':v).replace(/\r/g,'').trim()}
function field(block,label,next){
  const stop=(next||['HypeScore','Confiabilidad','Peso','Jinete','Entrenador','Establo/propietario','Uniforme','Últimas cinco','Días sin correr','Briseos disponibles','Perfil','Power/Rating','Distancia','Value','LECTURA','USO']).filter(x=>x!==label).map(escRx).join('|');
  const rx=new RegExp(escRx(label)+'\\s*:\\s*([\\s\\S]*?)'+(stop?'(?=\\s+(?:'+stop+')\\s*:|$)':'$'),'i');
  const m=rx.exec(block);return m?clean(m[1]):'';
}
function headerValue(text,label,nextLabels){
  const next=(nextLabels||[]).map(escRx).join('|');
  const rx=new RegExp(escRx(label)+'\\s*:\\s*([\\s\\S]*?)'+(next?'(?=\\s+(?:'+next+')\\s*:|$)':'$'),'i');
  const m=rx.exec(text);return m?clean(m[1]):'';
}
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
  const out=[]; const lines=text.split(/\n/); let pos=0;
  for(const line of lines){
    const m=line.match(/^\s*(?:[#>*_\-]+\s*)?R\s*(\d{1,2})\s*(?:[—–:\-|]|\s)+(.*)$/i);
    if(m && /CARRERA|RACE|\b\d{3,4}\s*M\b|MILLAS?|FURLONG/i.test(m[2])){
      const n=+m[1]; if(n>0&&n<30&&!out.some(x=>x.n===n))out.push({n,start:pos});
    }
    pos+=line.length+1;
  }
  return out.sort((a,b)=>a.start-b.start);
}
function checklistBlocks(section){
  const marker=/^(?:\s*)#(\d{1,2})\s+([^\n]+?)\s+[—–-]\s+([^\n]+)$/gim;
  const hits=[];let m;
  while((m=marker.exec(section))){
    const after=section.slice(marker.lastIndex,Math.min(section.length,marker.lastIndex+500));
    if(/HypeScore\s*:/i.test(after)&&/Confiabilidad\s*:/i.test(after))hits.push({n:+m[1],name:clean(m[2]),role:clean(m[3]),start:m.index});
  }
  const unique=[];for(const h of hits)if(!unique.some(x=>x.n===h.n))unique.push(h);
  return unique.map((h,i)=>{
    const end=i+1<unique.length?unique[i+1].start:section.length;
    const raw=section.slice(h.start,end).trim();
    const hs=(raw.match(/HypeScore\s*:\s*(\d+(?:\.\d+)?)/i)||[])[1];
    return {programNumber:h.n,name:h.name,role:h.role,hypeScore:hs==null?null:+hs,reliability:field(raw,'Confiabilidad'),raw};
  });
}
function boardRows(section){
  const area=(section.match(/🏆?\s*HYPEBOARD([\s\S]*?)(?=🐺?\s*CHECKLIST|⚖️?\s*CONTROL DE RIESGO|$)/i)||[])[1]||'';
  const rows=[];const rx=/^\s*\d+[.)]\s*#(\d{1,2})\s+(.+?)\s+[—–-]\s+(\d+(?:\.\d+)?)(?:\s+⭐+)?\s*$/gim;let m;
  while((m=rx.exec(area)))rows.push({programNumber:+m[1],name:clean(m[2]),role:'',hypeScore:+m[3],reliability:'',raw:m[0].trim()});
  return rows;
}
function quickHits(section,entries){
  function ref(label){const r=new RegExp(label+'\\s*:\\s*#(\\d{1,2})\\s+([^\\n—–]+)','i').exec(section);if(!r)return null;const e=entries.find(x=>x.programNumber===+r[1]);return e?{entryId:e.id,programNumber:e.programNumber,name:e.name}:null}
  return {select:ref('Select'),rival:ref('Rival'),sleeper:ref('Tapada'),valuePlay:ref('Huevazo')};
}
function horseProfile(h){
  const b=h.raw;
  return {
    name:h.name,programNumber:h.programNumber,role:h.role||'',reliability:h.reliability||'',
    weight:field(b,'Peso'),jockey:field(b,'Jinete'),trainer:field(b,'Entrenador'),
    owner:field(b,'Establo/propietario'),uniform:field(b,'Uniforme'),lastFive:field(b,'Últimas cinco'),
    daysSinceRace:field(b,'Días sin correr'),workouts:field(b,'Briseos disponibles'),paceProfile:field(b,'Perfil'),
    powerRating:field(b,'Power/Rating'),distance:field(b,'Distancia'),value:field(b,'Value'),
    reading:field(b,'LECTURA',['USO']),use:field(b,'USO',[])
  };
}
parseTextReport=function(text){
  const track=trackFromText(text),date=dateFromText(text),starts=raceStarts(text);
  if(!starts.length)throw new Error('No pude identificar ninguna carrera en el reporte.');
  const declared=/Carreras\s+analizadas\s*:\s*R(\d{1,2})\s*[–—-]\s*R(\d{1,2})/i.exec(text);
  const expected=declared?(+declared[2]-+declared[1]+1):starts.length;
  if(starts.length!==expected)throw new Error('El reporte declara '+expected+' carreras y el parser detectó '+starts.length+' encabezados de carrera.');
  const races=[],analyses={},horseData={};
  for(let i=0;i<starts.length;i++){
    const h=starts[i],end=i+1<starts.length?starts[i+1].start:text.length,section=text.slice(h.start,end);
    let horses=checklistBlocks(section); const board=boardRows(section);
    if(!horses.length)horses=board;
    if(!horses.length)throw new Error('R'+h.n+': no pude recuperar el campo activo.');
    if(board.length){
      const map=new Map(horses.map(x=>[x.programNumber,x]));
      for(const b of board){const x=map.get(b.programNumber);if(x&&x.hypeScore==null)x.hypeScore=b.hypeScore}
    }
    const declaredField=/Participantes\s*:\s*(\d+)/i.exec(section);
    if(declaredField&&horses.length!==+declaredField[1])throw new Error('R'+h.n+': el reporte declara '+declaredField[1]+' participantes activos y el parser recuperó '+horses.length+'.');
    const rid=track.id+'-'+date+'-r'+h.n;
    const entries=horses.map(x=>({id:rid+'-h'+x.programNumber,programNumber:x.programNumber,name:x.name}));
    races.push({id:rid,number:h.n,entries});
    const parsedHorses=horses.map(x=>{
      const entry=entries.find(e=>e.programNumber===x.programNumber);
      const row={entryId:entry.id,programNumber:x.programNumber,name:x.name,role:x.role||'',hypeScore:x.hypeScore,reliability:x.reliability||'',sourceText:x.raw};
      horseData[entry.id]={entryId:entry.id,status:'published',profile:horseProfile(x),pps:[],sourceText:x.raw};
      return row;
    });
    if(parsedHorses.some(x=>!Number.isFinite(Number(x.hypeScore))))throw new Error('R'+h.n+': falta HypeScore público en uno o más ejemplares.');
    analyses[rid]={trackId:track.id,raceId:rid,status:'published',publicContract:'dashboard-safe-v3.0',horses:parsedHorses,quickHits:quickHits(section,entries),sourceText:section.trim()};
  }
  races.sort((a,b)=>a.number-b.number);
  const meta=reportMeta(text);
  for(const x of meta.retirements){const race=races.find(r=>r.number===x.race);if(race&&race.entries.some(e=>e.programNumber===x.programNumber))throw new Error('R'+x.race+' #'+x.programNumber+' figura como retirado y no puede quedar en el campo activo.');}
  return {track,date,races,analyses,horseData,raw:text,reportMeta:meta};
};
applyParsed=function(p){
  _applyParsed(p);
  if(!p||p.candidate||!p.reportMeta)return;
  draft.latestReport=Object.assign({},draft.latestReport||{},p.reportMeta,{rawReport:p.raw,source:'admin-auto-parser',processedAt:new Date().toISOString()});
  persist();readyCandidate=buildCandidate();
  const errors=validateCandidate(readyCandidate);if(errors.length)throw new Error(errors[0]);
  renderReady(p.track.id,p.date,p.races,p.analyses);
};
const _validate=validateCandidate;
validateCandidate=function(c){
  const errors=_validate(c);
  for(const t of c&&c.tracks||[]){
    const d=c.raceDays&&c.raceDays[t.id]; if(!d)continue;
    for(const r of d.races||[]){
      const a=c.hypepredict&&c.hypepredict.analyses&&c.hypepredict.analyses[r.id];
      if(!a)errors.push('Falta análisis R'+r.number);
      else if(a.status==='published'&&(!Array.isArray(a.horses)||a.horses.length!==r.entries.length))errors.push('Análisis publicado incompleto R'+r.number);
      const nums=new Set();for(const e of r.entries||[]){if(nums.has(e.programNumber))errors.push('Número duplicado R'+r.number+' #'+e.programNumber);nums.add(e.programNumber)}
    }
  }
  return Array.from(new Set(errors));
};
})();