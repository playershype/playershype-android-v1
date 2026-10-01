(function(){
'use strict';
if(typeof parseTextReport!=='function'||typeof validateCandidate!=='function')return;
const _parseTextReport=parseTextReport;
const _applyParsed=applyParsed;

function clean(v){return String(v||'').trim()}
function headerValue(text,label,nextLabels){
  const next=(nextLabels||[]).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  const rx=new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*:\\s*([\\s\\S]*?)'+(next?'(?=\\s+(?:'+next+')\\s*:|$)':'$'),'i');
  const m=rx.exec(text);return m?clean(m[1]):'';
}
function retirementList(text){
  const line=headerValue(text,'Retiros confirmados',['Cambios oficiales','Condición oficial de pista','Track Bias confirmado']);
  if(!line||/ninguno confirmado/i.test(line))return [];
  const out=[];const rx=/R(\d{1,2})\s*#(\d{1,2})\s+([^;\n]+)/gi;let m;
  while((m=rx.exec(line)))out.push({race:+m[1],programNumber:+m[2],name:clean(m[3])});
  return out;
}
function reportMeta(text){
  return {
    pick6:headerValue(text,'Pick 6 oficial',['Unidad oficial Pick 6','Retiros confirmados']),
    pick6Unit:headerValue(text,'Unidad oficial Pick 6',['Retiros confirmados','Cambios oficiales']),
    retirements:retirementList(text),
    retirementsText:headerValue(text,'Retiros confirmados',['Cambios oficiales']),
    officialChanges:headerValue(text,'Cambios oficiales',['Condición oficial de pista']),
    trackCondition:headerValue(text,'Condición oficial de pista',['Track Bias confirmado']),
    trackBias:headerValue(text,'Track Bias confirmado',[])
  };
}

parseTextReport=function(text){
  const p=_parseTextReport(text);
  const declared=/Carreras\s+analizadas\s*:\s*R(\d{1,2})\s*[–—-]\s*R(\d{1,2})/i.exec(text);
  if(declared){
    const expected=(+declared[2])-(+declared[1])+1;
    if(p.races.length!==expected)throw new Error('El reporte declara '+expected+' carreras y el parser recuperó '+p.races.length+'.');
  }
  for(const r of p.races){
    const a=p.analyses[r.id];
    const source=String(a&&a.sourceText||'');
    const declaredField=/Participantes\s*:\s*(\d+)/i.exec(source);
    if(declaredField&&r.entries.length!==+declaredField[1])throw new Error('R'+r.number+': el reporte declara '+declaredField[1]+' participantes activos y el parser recuperó '+r.entries.length+'.');
    if(!a||!Array.isArray(a.horses)||a.horses.length!==r.entries.length)throw new Error('R'+r.number+': HypeBoard/Checklist no coincide con participantes activos.');
    const validPublic=a.horses.length>0&&a.horses.every(h=>Number.isFinite(Number(h.hypeScore))&&Number(h.hypeScore)>=0&&Number(h.hypeScore)<=10);
    a.status=validPublic?'published':'ready';
    a.publicContract='dashboard-safe-v3.0';
  }
  p.reportMeta=reportMeta(text);
  for(const x of p.reportMeta.retirements){
    const race=p.races.find(r=>r.number===x.race);
    if(race&&race.entries.some(e=>Number(e.programNumber)===x.programNumber))throw new Error('R'+x.race+' #'+x.programNumber+' figura como retirado y no puede quedar en el campo activo.');
  }
  return p;
};

applyParsed=function(p){
  _applyParsed(p);
  if(!p||p.candidate||!p.reportMeta)return;
  draft.latestReport=Object.assign({},draft.latestReport||{},p.reportMeta,{rawReport:p.raw,source:'admin-auto-parser',processedAt:new Date().toISOString()});
  persist();
  readyCandidate=buildCandidate();
  const errors=validateCandidate(readyCandidate);
  if(errors.length)throw new Error(errors[0]);
  renderReady(p.track.id,p.date,p.races,p.analyses);
};

validateCandidate=function(c){
  const errors=[];
  if(!c||Number(c.schemaVersion)<2)errors.push('schemaVersion inválido');
  const expected=SCORE,components=c&&c.hypepredict&&c.hypepredict.scoreContract&&c.hypepredict.scoreContract.components||[],actual={};
  for(const x of components)actual[x.id]=Number(x.weight);
  for(const [k,v] of Object.entries(expected))if(Math.abs((actual[k]??999)-v)>1e-9)errors.push('Contrato HypeScore alterado: '+k);
  if(Math.abs(Object.values(actual).reduce((a,b)=>a+b,0)-10)>1e-9)errors.push('El contrato HypeScore no suma 10.00');
  const allEntryIds=new Set();
  for(const t of c&&c.tracks||[]){
    const d=c.raceDays&&c.raceDays[t.id];
    if(!d){errors.push('Falta raceDay '+t.id);continue}
    if(Number(t.races)!==(d.races||[]).length)errors.push('Conteo de carreras no sincronizado '+t.id);
    const raceIds=new Set();
    for(const r of d.races||[]){
      if(!r.id||!Number.isInteger(r.number)||r.number<1)errors.push('Carrera inválida '+t.id);
      if(raceIds.has(r.id))errors.push('Race ID duplicado '+r.id);raceIds.add(r.id);
      if(!Array.isArray(r.entries)||!r.entries.length)errors.push('Carrera sin ejemplares R'+r.number);
      const raceEntryIds=new Set();
      for(const e of r.entries||[]){
        if(!e.id||!e.name)errors.push('Entrada incompleta R'+r.number);
        if(raceEntryIds.has(e.id))errors.push('Entrada duplicada '+e.id);
        raceEntryIds.add(e.id);allEntryIds.add(e.id);
      }
      const a=Object.values(c.hypepredict&&c.hypepredict.analyses||{}).find(x=>x&&x.trackId===t.id&&x.raceId===r.id);
      if(a){
        const seen=new Set();
        if(a.status==='published'&&(!Array.isArray(a.horses)||a.horses.length!==r.entries.length))errors.push('Análisis publicado incompleto R'+r.number);
        for(const h of a.horses||[]){
          if(!raceEntryIds.has(h.entryId))errors.push('Análisis referencia ejemplar inexistente '+h.entryId);
          if(seen.has(h.entryId))errors.push('Análisis duplica ejemplar '+h.entryId);seen.add(h.entryId);
          if(a.status==='published'){
            const hs=Number(h.hypeScore);
            if(!Number.isFinite(hs)||hs<0||hs>10)errors.push('HypeScore público inválido '+h.entryId);
            if(h.scores!=null){
              const sc=h.scores||{},keys=Object.keys(sc);
              if(keys.length!==9||Object.keys(expected).some(k=>!Object.prototype.hasOwnProperty.call(sc,k)))errors.push('Desglose interno incompleto '+h.entryId);
              else {
                let total=0;for(const [k,max] of Object.entries(expected)){const v=Number(sc[k]);if(!Number.isFinite(v)||v<0||v>max)errors.push('Factor HypeScore inválido '+k+' '+h.entryId);total+=v}
                if(Number.isFinite(hs)&&Math.abs(total-hs)>.011)errors.push('HypeScore no cuadra '+h.entryId);
              }
            }
          }
        }
      }
    }
  }
  for(const [id,h] of Object.entries(c&&c.horseData||{})){
    if(h&&h.status==='published'){
      if(!allEntryIds.has(id))errors.push('Horse Hub referencia entrada inexistente '+id);
      if(!h.profile||!h.profile.name||!Array.isArray(h.pps))errors.push('Horse Hub publicado incompleto '+id);
    }
  }
  return errors;
};

setTimeout(function(){try{const t=document.getElementById('hypeText');if(t&&t.value.trim())processInput()}catch(e){console.error(e)}},0);
})();
