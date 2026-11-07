/* PH_EXPERIENCE_START: public presentation only; never writes published data. */
function xpText(value){
 if(value===null||value===undefined)return '';
 if(Array.isArray(value))return value.map(xpText).filter(Boolean).join(' · ');
 const text=String(value).trim();
 if(text.startsWith('[')){try{const parsed=JSON.parse(text);if(Array.isArray(parsed))return xpText(parsed)}catch{}}
 return text;
}
function xpLabel(value){
 const text=xpText(value),key=text.toLowerCase().replace(/[_-]/g,' ');
 return ({'co base':'Co-base',select:'Select',contendiente:'Contendiente',rival:'Rival',tapada:'Tapada',huevazo:'Huevazo',descarte:'Descarte'})[key]||text;
}
function xpKnown(value){return !!xpText(value)&&!/^(no publicado|no disponible|sin datos)$/i.test(xpText(value))}
function xpSilkSpec(description){
 const raw=xpText(description),text=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bvde\b/g,'verde');
 // Only complete, explicitly located designs are drawn. Unknown logos/patterns fail closed.
 const colors={verde:'#16875f',naranja:'#ff851b',azul:'#1764bd',rojo:'#dc343d',roja:'#dc343d',blanco:'#f5f7fa',blanca:'#f5f7fa',negro:'#202733',negra:'#202733',amarillo:'#ffd329',amarilla:'#ffd329'};
 const solid=text.match(/^(verde|azul|rojo|roja|blanco|blanca|negro|negra|amarillo|amarilla)[.,]?$/);
 const diamond=text.match(/^(verde|azul|rojo|roja|blanco|blanca|negro|negra|amarillo|amarilla)\s*,?\s*diamante\s+(naranja|verde|azul|rojo|roja|blanco|blanca|negro|negra|amarillo|amarilla)\s+(?:frte|frente|al frente)\s+y\s+espalda[.]?$/);
 if(diamond)return {base:colors[diamond[1]],mark:colors[diamond[2]],back:true,raw,partial:false};
 if(solid)return {base:colors[solid[1]],mark:null,back:false,raw,partial:false};
 const allColors={...colors,marron:'#784c38',gris:'#8c939c',vino:'#722c49','azul claro':'#80bce1','azul marino':'#172d51'};
 const base=text.match(/^(azul claro|azul marino|verde|azul|rojo|roja|blanco|blanca|negro|negra|amarillo|amarilla|naranja|marron|gris|vino)\b/);
 // Two body colors without a specified arrangement cannot become a one-color jersey.
 if(base&&!/^\s*(?:y\s+(?:verde|azul|rojo|roja|negra|blanca|amarilla|naranja)\b|,\s*(?:verde|azul|rojo|amarillo|naranja)\b)/.test(text.slice(base[0].length))){
  const sleeves=text.match(/(?:mangas|mgs|mgas)\s+(amarillas?|blancas?|negras?|rojas?|azules?|verdes?)\b(?!\s+y\b)/);
  const sleeveKey=sleeves&&sleeves[1].replace(/s$/,'').replace(/^azule$/,'azul');
  return {base:allColors[base[1]],mark:null,back:false,raw,partial:true,sleeve:allColors[sleeveKey]};
 }
 return null;
}
function xpSilk(description,compact=false){
 const raw=xpText(description),spec=xpSilkSpec(raw);
 if(!spec)return '<div class="xp-silk-pending'+(compact?' compact':'')+'"><span aria-hidden="true">◇</span><small>'+(xpKnown(raw)?'Uniforme pendiente de referencia':'Uniforme no publicado')+'</small></div>';
 function view(back){
  const diamond=spec.mark?'<path d="M60 43 78 67 60 91 42 67Z" fill="'+spec.mark+'"/>':'';
  return '<svg viewBox="0 0 120 130" role="img" aria-label="'+hpEsc((spec.partial?'Ilustración parcial: ':'')+(back?'Espalda: ':'Frente: ')+raw)+'"><path d="M37 22 22 27 6 86 23 93 37 48M83 22 98 27 114 86 97 93 83 48" fill="'+(spec.sleeve||'#c4cdd4')+'" stroke="#536779" stroke-width="1.5"/><path d="M37 22 49 17Q60 23 71 17L83 22 86 113Q60 122 34 113Z" fill="'+spec.base+'" stroke="#102946" stroke-width="1.8"/>'+diamond+'<path d="M37 26 40 108M83 26 80 108" fill="none" stroke="white" stroke-opacity=".24" stroke-width="2"/><path d="M49 17Q60 33 71 17" fill="none" stroke="#102946" stroke-width="2"/><path d="M44 108Q60 111 76 108" fill="none" stroke="#102946" stroke-opacity=".25"/></svg>';
 }
 if(compact)return '<span class="xp-silk-mini" title="'+(spec.partial?'Ilustración parcial':'Ilustración según descripción')+'">'+view(false)+'</span>';
 return '<figure class="xp-silk-art"><div class="xp-silk-views"><div>'+view(false)+'<small>'+(spec.partial?'VISTA PARCIAL':'FRENTE')+'</small></div>'+(spec.back?'<div>'+view(true)+'<small>ESPALDA</small></div>':'')+'</div><figcaption>'+(spec.partial?'Ilustración parcial: faltan logos o detalles de la descripción. ':'Ilustración según descripción. ')+(spec.sleeve?'':'Mangas en gris: sin detalle representado. ')+'Gorra sin representar.</figcaption></figure>';
}
function xpFieldPairs(h){
 const data=hpProfileData(h),get=data.get;
 return [['Peso',get('Peso',h.raceData?.weight)],['Días sin correr',get('Días sin correr',h.raceData?.daysSinceLastRace)],['Jinete',get('Jinete',h.connections?.jockey)],['Entrenador',get('Entrenador',h.connections?.trainer)],['Establo / propietario',get('Establo/propietario',h.connections?.stable||h.connections?.owner)],['Últimas cinco',get('Últimas cinco',h.form?.lastFiveDisplay)],['Perfil de paso',get('Perfil',h.paceProfile?.display)],['Power / Rating',get('Power/Rating',h.raceData?.powerNumber)],['En la distancia',get('Distancia',h.form?.distanceRecord)],['Value',get('Value',h.value?.gradeDisplay)]];
}
var xpReviewed=new Set();
function xpReviewKey(a,h){return JSON.stringify([DATA?.revision||'',a.raceId||'',h.programNumber,h.name])}
function fullCheckList(a){
 const horses=Array.isArray(a?.horses)?a.horses:[];
 if(!horses.length)return '<p class="missing-field">Checklist no recibido.</p>';
 const count=horses.filter(h=>xpReviewed.has(xpReviewKey(a,h))).length;
 return '<div class="xp-checklist"><div class="xp-check-toolbar"><div><b>Tu revisión del campo</b><p>Marca cada ficha después de revisarla.</p></div><output class="xp-review-count" aria-live="polite">'+count+' / '+horses.length+' revisados</output></div><progress class="xp-review-progress" value="'+count+'" max="'+horses.length+'" aria-label="Fichas revisadas"></progress><label class="xp-search"><span>Buscar ejemplar</span><input type="search" placeholder="Número o nombre" data-xp-search autocomplete="off"></label><p class="xp-no-matches" hidden>Sin coincidencias.</p>'+horses.map((h,i)=>{
  const data=hpProfileData(h),get=data.get,key=xpReviewKey(a,h),silk=get('Uniforme',h.silks?.description);
  return '<details class="xp-check-card" data-xp-name="'+hpEsc('#'+h.programNumber+' '+h.name)+'"><summary>'+hpSaddle(h.programNumber)+xpSilk(silk,true)+'<span class="xp-check-name"><strong>'+hpEsc(h.name)+'</strong><small>'+hpEsc(xpLabel(h.role||h.roles?.primary))+'</small></span><span class="xp-check-score">'+hpScore(h)+'<small>HypeScore</small></span><span class="xp-chevron" aria-hidden="true">⌄</span></summary><div class="xp-check-content"><label class="xp-reviewed"><input type="checkbox" data-xp-reviewed="'+hpEsc(key)+'" '+(xpReviewed.has(key)?'checked':'')+'> Ficha revisada por mí</label><p class="xp-note">Marca personal de lectura; no cambia la evaluación.</p><div class="xp-check-reliability">Confiabilidad: '+hpEsc(get('Confiabilidad',h.reliability||h.model?.reliability))+'</div><dl class="xp-facts">'+xpFieldPairs(h).map(([label,value])=>'<div><dt>'+hpEsc(label)+'</dt><dd>'+hpEsc(value)+'</dd></div>').join('')+'</dl><div class="xp-check-uniform">'+xpSilk(silk)+'<b>Uniforme publicado</b><p>'+hpEsc(silk)+'</p></div><details class="xp-check-reading"><summary>Leer briseos, lectura y uso</summary><h5>Briseos disponibles</h5><p>'+hpEsc(get('Briseos disponibles',Array.isArray(h.works)?h.works.map(w=>w.raw||'').filter(Boolean).join(' | '):undefined))+'</p><h5>Lectura</h5><p>'+hpEsc(get('LECTURA',h.reading))+'</p><h5>Uso recomendado</h5><p>'+hpEsc(xpLabel(get('USO',h.roles?.recommendedUse)))+'</p></details><button type="button" class="xp-open-profile" data-xp-profile="'+i+'">Abrir perfil completo →</button></div></details>';
 }).join('')+'<p class="xp-note">Las marcas se conservan durante esta sesión y corresponden a esta publicación.</p></div>';
}
function hpHorseProfile(h,raceNo){
 const data=hpProfileData(h),get=data.get,missing='No publicado';
 const score=h.hypeScore??h.model?.hypeScore??get('HypeScore'),reliability=h.reliability||h.model?.reliability||get('Confiabilidad');
 const last=get('Últimas cinco',h.form?.lastFiveDisplay),results=/^\d+(?:\s*[-–]\s*\d+)*$/.test(last)?last.split(/\s*[-–]\s*/):null;
 const works=get('Briseos disponibles',Array.isArray(h.works)?h.works.map(w=>w.raw||'').filter(Boolean).join(' | '):undefined),workRows=xpKnown(works)?works.split(/\s*\|\s*/).filter(Boolean):[];
 const silk=get('Uniforme',h.silks?.description),reading=get('LECTURA',h.reading),use=xpLabel(get('USO',h.roles?.recommendedUse));
 const metrics=[['HypeScore',score],['Confiabilidad',reliability],['Peso',get('Peso',h.raceData?.weight)],['Días sin correr',get('Días sin correr',h.raceData?.daysSinceLastRace)]];
 const tabs=[['summary','Resumen'],['form','Forma'],['works','Briseos'+(workRows.length?' · '+workRows.length:'')],['reading','Lectura']];
 function panel(key,html){return '<div role="tabpanel" id="xp-panel-'+key+'" aria-labelledby="xp-tab-'+key+'" tabindex="0" '+(key!=='summary'?'hidden':'')+'>'+html+'</div>'}
 return '<div class="horse-panel profile-panel xp-profile" role="dialog" aria-modal="true" aria-labelledby="profileName" tabindex="-1"><div class="horse-panel-header"><div><span class="profile-eyebrow">PLAYERSHYPE · HYPEPREDICT</span><b>PERFIL DEL EJEMPLAR</b></div><button id="closeHorse" type="button" aria-label="Cerrar perfil">×</button></div><div class="profile-body"><header class="profile-hero"><div class="profile-identity">'+hpSaddle(h.programNumber)+'<div><span class="profile-eyebrow">CARRERA '+hpEsc(raceNo)+'</span><h2 id="profileName">'+hpEsc(h.name)+'</h2></div></div><span class="profile-role">'+hpEsc(xpLabel(h.role||h.roles?.primary))+'</span></header><div class="profile-metrics">'+metrics.map((m,i)=>'<div class="profile-metric '+(i===0?'primary':'')+'"><span>'+hpEsc(m[0])+'</span><strong>'+hpEsc(m[1])+'</strong>'+(i===0?'<small>de 10 · puntuación del modelo</small>':'')+'</div>').join('')+'</div><nav class="xp-tabs" role="tablist" aria-label="Información del ejemplar">'+tabs.map(([key,label],i)=>'<button type="button" role="tab" id="xp-tab-'+key+'" aria-controls="xp-panel-'+key+'" aria-selected="'+(i===0)+'" tabindex="'+(i===0?'0':'-1')+'" data-xp-tab="'+key+'">'+label+'</button>').join('')+'</nav>'+
 panel('summary','<section class="profile-section xp-uniform"><h3>Uniforme del ejemplar</h3>'+xpSilk(silk)+'<p class="xp-uniform-description">'+hpEsc(silk)+'</p></section>'+hpProfileTable('Conexiones',[['Jinete',get('Jinete',h.connections?.jockey)],['Entrenador',get('Entrenador',h.connections?.trainer)],['Establo / propietario',get('Establo/propietario',h.connections?.stable||h.connections?.owner)]])+'<div class="xp-use-badge"><span>Uso recomendado</span><strong>'+hpEsc(use)+'</strong></div>')+
 panel('form','<section class="profile-section"><h3>Forma y rendimiento</h3><div class="profile-form"><span>Últimas cinco publicadas</span>'+(results?'<div class="profile-results" aria-label="Últimas cinco: '+hpEsc(last)+'">'+results.map((v,i)=>'<span class="profile-result '+(v==='1'?'win':'')+'" title="Resultado publicado '+(i+1)+'">'+hpEsc(v)+'</span>').join('')+'</div>':'<strong>'+hpEsc(last)+'</strong>')+'</div>'+hpProfileTable('Rendimiento publicado',xpFieldPairs(h).slice(6))+'</section>')+
 panel('works','<section class="profile-section profile-works"><h3>Briseos disponibles <span class="profile-count">'+workRows.length+'</span></h3>'+(workRows.length?'<ol class="xp-workouts">'+workRows.map((w,i)=>'<li><span class="xp-work-index">'+String(i+1).padStart(2,'0')+'</span><p>'+hpEsc(w)+'</p></li>').join('')+'</ol>':'<p class="profile-missing">'+hpEsc(works)+'</p>')+'<p class="xp-note">Se conserva el orden y el detalle publicado.</p></section>')+
 panel('reading','<section class="profile-section profile-reading"><h3>Lectura del ejemplar</h3><p>'+hpEsc(reading)+'</p><div class="profile-use"><span>Uso recomendado</span><strong>'+hpEsc(use)+'</strong></div></section>'+(data.extra.length?'<section class="profile-section"><h3>Información adicional</h3><p class="profile-additional">'+hpEsc(data.extra.join('\n'))+'</p></section>':''))+'</div></div>';
}
function xpSelectTab(button){
 const root=button.closest('.xp-profile');if(!root)return;
 root.querySelectorAll('[data-xp-tab]').forEach(b=>{const active=b===button;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;const panel=root.querySelector('#'+b.getAttribute('aria-controls'));if(panel)panel.hidden=!active});
}
document.addEventListener('click',event=>{
 const tab=event.target.closest('[data-xp-tab]');if(tab){xpSelectTab(tab);return}
 const open=event.target.closest('[data-xp-profile]');if(open){hpOpenHorse(Number(open.dataset.xpProfile));return}
 const pick=event.target.closest('[data-xp-pick]');if(pick){const ctx=hpMatchSource(hpScreen()),index=ctx?.a?.horses?.findIndex(h=>String(h.programNumber)===pick.dataset.xpPick);if(index>=0)hpOpenHorse(index)}
});
document.addEventListener('keydown',event=>{
 const tab=event.target.closest('[data-xp-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 const tabs=Array.from(tab.parentElement.querySelectorAll('[data-xp-tab]')),i=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
 event.preventDefault();xpSelectTab(tabs[next]);tabs[next].focus();
});
document.addEventListener('input',event=>{
 if(!event.target.matches('[data-xp-search]'))return;
 const root=event.target.closest('.xp-checklist'),query=event.target.value.trim().toLocaleLowerCase();let count=0;
 root.querySelectorAll('.xp-check-card').forEach(card=>{card.hidden=!card.dataset.xpName.toLocaleLowerCase().includes(query);if(!card.hidden)count++});root.querySelector('.xp-no-matches').hidden=count>0;
});
document.addEventListener('change',event=>{
 if(!event.target.matches('[data-xp-reviewed]'))return;
 const box=event.target,key=box.dataset.xpReviewed;if(box.checked)xpReviewed.add(key);else xpReviewed.delete(key);
 while(xpReviewed.size>300)xpReviewed.delete(xpReviewed.values().next().value);
 document.querySelectorAll('.xp-checklist').forEach(root=>{const boxes=Array.from(root.querySelectorAll('[data-xp-reviewed]'));boxes.forEach(b=>b.checked=xpReviewed.has(b.dataset.xpReviewed));const count=boxes.filter(b=>b.checked).length;root.querySelector('output').textContent=count+' / '+boxes.length+' revisados';root.querySelector('progress').value=count});
});
/* PH_EXPERIENCE_END */
