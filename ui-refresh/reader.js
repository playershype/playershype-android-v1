/* Trusted presentation only. Published analyses are never mutated. */
function hpHorseAttrs(h){
 const id=$('#track')?.value,date=$('#date')?.value,d=day(id,date),r=d?.races?.find(r=>Number(r.number)===hpScreen()),a=r&&analysisFor(r);
 const i=(a?.horses||[]).findIndex(x=>h?.entryId?x.entryId===h.entryId:String(x.programNumber)===String(h?.programNumber));
 return i<0?'':` data-horse-index="${i}" aria-label="Abrir ficha de ${hpEsc(h.name||h.programNumber)}"`;
}
function quickPick(label,h,variant=''){
 if(!h||!h.name)return '';
 return `<button type="button" class="quick-cell ${hpEsc(variant)}"${hpHorseAttrs(h)}><span class="slot">${hpEsc(label)}</span><span class="horse">${hpSaddle(h.programNumber)}<span>${hpEsc(h.name)}</span></span><span class="score">${hpScore(h)} <small>/ 10</small></span><span class="card-hint">Ver ficha ↗</span></button>`;
}
function hpPaceMap(pace){
 return `<div class="pace-direction">Dirección de carrera <span aria-hidden="true">→</span></div><div class="pace-map" aria-label="Pelotón: punteros a la derecha">${[['Closer','closer'],['Stalker','stalker'],['Presser','presser'],['Speed','speed']].map(([label,key])=>`<div class="pace-group"><span class="pace-label">${label}</span><div class="pace-runners">${(Array.isArray(pace[key])?pace[key]:[]).map(h=>`<button type="button" class="pace-runner"${hpHorseAttrs(h)} title="${hpEsc(h.name||'')} · ${label}">${hpSaddle(h.programNumber)}<span class="runner-name">${hpEsc(h.name||'')}</span></button>`).join('')||'<span class="pace-empty">Sin datos</span>'}</div></div>`).join('')}</div><p class="map-note">Posición por estilo; no establece un orden exacto dentro de cada grupo.</p>`;
}
function hpFinishProjection(a){
 const rows=(Array.isArray(a.hypeBoard)?a.hypeBoard:[]).slice().sort((x,y)=>Number(x.rank)-Number(y.rank));
 if(!rows.length)return '';
 return `<section class="finish-projection"><h4 class="block-title">Proyección de llegada · HypeBoard</h4><p class="map-note">Orden publicado en el análisis; no es un resultado oficial.</p><div class="finish-runners">${rows.map((h,i)=>`<button type="button" class="finish-runner"${hpHorseAttrs(h)}><small>${hpEsc(h.rank??i+1)}.º</small>${hpSaddle(h.programNumber)}<span>${hpEsc(h.name||'')}</span></button>`).join('')}</div></section>`;
}
function roleAndBoard(a){
 const base=Array.isArray(a.horses)?a.horses:[],board=Array.isArray(a.hypeBoard)?a.hypeBoard:[];
 const horses=board.length?board.slice().sort((x,y)=>Number(x.rank)-Number(y.rank)).map(b=>({...base.find(h=>String(h.programNumber)===String(b.programNumber)),...b})):base;
 return `<div class="board-wrap"><table class="board-table"><thead><tr><th>Pos.</th><th>Ejemplar</th><th>HypeScore</th><th>Confiabilidad</th></tr></thead><tbody>${horses.map((h,i)=>`<tr class="horse-row" tabindex="0" role="button"${hpHorseAttrs(h)}><td>${hpEsc(h.rank??i+1)}</td><td><span class="board-id">${hpSaddle(h.programNumber)}<span class="name">${hpEsc(h.name)}</span></span><span class="role">${hpEsc(h.role||'')}</span></td><td class="score-num">${hpScore(h)}<div class="scorebar"><i style="width:${Math.max(0,Math.min(100,Number(h.hypeScore)||0)*10)}%"></i></div></td><td>${hpEsc(h.reliability||'No disponible')}</td></tr>`).join('')}</tbody></table></div>`;
}
function hpDayView(track,d){
 const races=d.races||[],list=races.map(r=>({r,a:analysisFor(r)})).filter(x=>x.a?.status==='published'&&x.a.trackId===track.id&&x.a.raceId===x.r.id);
 return `<div class="dashboard-shell"><section class="jornada-command"><div><div class="jornada-command-kicker">PLAYERSHYPE · HYPEPREDICT</div><h2>Jornada</h2><p>${hpEsc(track.name)} · ${hpEsc(d.date)}</p></div><span class="jornada-count">${list.length}/${races.length} análisis</span></section>${hpWxCard(track,d.date)}<section class="day-races" aria-label="Carreras de la jornada">${list.map(({r,a})=>{const q=a.quickHits||{},h=q.select||{};return `<a class="day-race" href="#race-${hpEsc(r.number)}"><div class="day-race-top"><b>Carrera ${hpEsc(r.number)}</b><span>Riesgo: ${hpEsc(q.risk||a.riskControl?.risk||'No disponible')}</span></div><div class="day-race-pick">${hpSaddle(h.programNumber??'—')}<strong>${hpEsc(h.name||'Select no publicado')}</strong><b>${hpScore(h)}<small> HypeScore</small></b></div><div class="day-race-foot">${hpEsc(a.raceMeta?.distance||'')} · Ver análisis y ejemplares →</div></a>`}).join('')}</section></div>`;
}
function hpWager(a){
 let raw=a.hypeBet??sourceHypeBet(a),value=raw;
 if(typeof value==='string'){try{value=JSON.parse(value)}catch{return '<p class="wager-text">'+hpEsc(/^[\[{]/.test(value.trim())?'No se pudo interpretar la estructura de esta jugada publicada.':value)+'</p>'}}
 const bets=Array.isArray(value)?value:value&&typeof value==='object'?[value]:[];
 return bets.map(b=>{if(!b||typeof b!=='object')return '';const labels={trifecta:'Trifecta',exacta:'Exacta',superfecta:'Superfecta',win:'Ganador',place:'Place',show:'Show'};
 const positions=Array.isArray(b.positions)?b.positions:[];
 const amount=v=>typeof v==='number'&&Number.isFinite(v)?'$'+v.toFixed(2):hpEsc(v??'No disponible');
 return `<article class="bet-ticket"><h5>${hpEsc(labels[b.betType]||b.betType||'Jugada publicada')}</h5>${positions.length?`<table class="bet-table"><thead><tr><th>Posición</th><th>Ejemplares</th></tr></thead><tbody>${positions.map(p=>`<tr><th scope="row">${hpEsc(p.position)}.º</th><td><div class="bet-numbers">${(Array.isArray(p.horses)?p.horses:[]).map(n=>hpSaddle(n)).join('')}</div></td></tr>`).join('')}</tbody></table>`:'<p>Sin estructura de posiciones publicada.</p>'}<dl class="bet-totals"><div><dt>Unidad</dt><dd>${amount(b.unit)}</dd></div><div><dt>Combinaciones publicadas</dt><dd>${hpEsc(b.combinations??'No disponible')}</dd></div><div><dt>Costo publicado</dt><dd>${amount(b.derivedCost??b.totalCost??b.cost)}</dd></div></dl></article>`}).join('')||'<p>No hay jugada publicada.</p>';
}
function hpDataText(v){
 if(v==null||v==='')return 'No disponible';
 if(Array.isArray(v))return v.map(hpDataText).join(' · ');
 if(typeof v==='object')return Object.entries(v).filter(([,x])=>x!=null&&x!=='').map(([k,x])=>k+': '+hpDataText(x)).join(' · ');
 const s=String(v);if(s.startsWith('[')){try{return hpDataText(JSON.parse(s))}catch{}}
 return s;
}
function hpRowsTable(title,headers,rows,cls=''){
 return `<section class="profile-section"><h3>${hpEsc(title)}</h3>${rows.length?`<div class="table-scroll" role="region" aria-label="${hpEsc(title)}" tabindex="0"><table class="profile-table data-table ${cls}"><caption class="profile-sr">${hpEsc(title)}</caption><thead><tr>${headers.map((h,i)=>`<th scope="col" aria-sort="none"><button type="button" data-sort-column="${i}">${hpEsc(h)} <span aria-hidden="true">↕</span></button></th>`).join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map(v=>'<td>'+hpEsc(hpDataText(v))+'</td>').join('')+'</tr>').join('')}</tbody></table></div>`:'<p class="profile-missing">No disponible en la fuente publicada.</p>'}</section>`;
}
function hpWorkoutRows(h,get){
 if(Array.isArray(h.works)&&h.works.length&&h.works.some(w=>w.date||w.distance||w.time))return h.works.map(w=>[w.date,w.track,w.distance,w.time,w.rank??w.position,w.raw||w.type]);
 const raw=get('Briseos disponibles');if(/^(no publicado|no disponible)$/i.test(raw))return [];
 return raw.split(/\s*\|\s*/).filter(Boolean).map(raw=>{const m=raw.match(/^(\d{1,2}\s+[A-Za-z]{3}\s+\d{2})\s+(\S+)\s+(\d+(?:\.\d+)?[FM])\s+(\S+)\s+(:?\d[^\s]*)\s+(.+)$/i);if(!m)return ['—','—','—','—','—',raw];const rank=m[6].match(/\b\d+\/\d+\b/);return [m[1],m[2],m[3],m[5],rank?.[0]||'—',m[4]+' · '+m[6].replace(/\b\d+\/\d+\b/,'').trim()]});
}
function hpHorseSections(h){
 const data=hpProfileData(h),get=data.get;
 const connection=(key,label)=>{const c=h.connections?.[key],obj=c&&typeof c==='object'?c:{};return [label,obj.name||get(label,key==='stable'?h.connections?.stable||h.connections?.owner:typeof c==='string'?c:undefined),obj.record??obj.stats??h.connections?.[key+'Record']??get('Récord '+label,'No disponible'),obj.period??get('Período '+label,'No disponible'),obj.context??get('Contexto '+label,'No disponible')]};
 const connections=[connection('jockey','Jinete'),connection('trainer','Entrenador'),connection('stable','Establo/propietario')];
 const past=h.pastPerformances||h.performances||h.form?.races;
 const pastRows=Array.isArray(past)?past.map(p=>[p.date,p.track,p.distance,p.surface,p.finish??p.position,p.time??p.speed]):[];
 const works=hpWorkoutRows(h,get),last=get('Últimas cinco',h.form?.lastFiveDisplay),results=/^\d+(?:\s*[-–]\s*\d+)*$/.test(last)?last.split(/\s*[-–]\s*/):null;
 return hpRowsTable('Conexiones',['Conexión','Nombre','Récord publicado','Período','Contexto'],connections,'connection-table')+
 '<section class="profile-section"><h3>Forma y rendimiento</h3><div class="profile-form"><span>Últimas cinco</span>'+(results?'<div class="profile-results">'+results.map(v=>'<span class="profile-result '+(v==='1'?'win':'')+'">'+hpEsc(v)+'</span>').join('')+'</div>':'<strong>'+hpEsc(last)+'</strong>')+'</div>'+hpProfileTable('Datos del ejemplar',[['Perfil de paso',get('Perfil',h.paceProfile?.display)],['Power / Rating',get('Power/Rating',h.raceData?.powerNumber)],['En la distancia',get('Distancia',h.form?.distanceRecord)],['Uniforme',get('Uniforme',h.silks?.description)]])+'</section>'+
 hpRowsTable('Actuaciones previas',['Fecha','Pista','Distancia','Superficie','Llegada','Tiempo / cifra publicada'],pastRows,'performance-table')+
 hpRowsTable('Briseos disponibles',['Fecha','Pista','Distancia','Tiempo','Posición','Detalle publicado'],works,'profile-work-table')+
 '<section class="profile-section profile-reading"><h3>Lectura del ejemplar</h3><p>'+hpEsc(get('LECTURA',h.reading))+'</p><div class="profile-use"><span>Uso recomendado</span><strong>'+hpEsc(hpDataText(get('USO',h.roles?.recommendedUse)))+'</strong></div></section>'+
 (data.extra.length?'<details class="profile-section"><summary>Más información publicada</summary><p class="profile-additional">'+hpEsc(data.extra.join('\n'))+'</p></details>':'');
}
function hpHorseProfile(h,raceNo){
 const get=hpProfileData(h).get,metrics=[['HypeScore',h.hypeScore??h.model?.hypeScore??get('HypeScore')],['Confiabilidad',h.reliability||get('Confiabilidad')],['Peso',get('Peso',h.raceData?.weight)],['Días sin correr',get('Días sin correr',h.raceData?.daysSinceLastRace)]];
 return `<div class="horse-panel profile-panel" role="dialog" aria-modal="true" aria-labelledby="profileName" tabindex="-1"><div class="horse-panel-header"><div><span class="profile-eyebrow">PLAYERSHYPE · HYPEPREDICT</span><b>PERFIL DEL EJEMPLAR</b></div><button id="closeHorse" type="button" aria-label="Cerrar perfil">×</button></div><div class="profile-body"><header class="profile-hero"><div class="profile-identity">${hpSaddle(h.programNumber)}<div><span class="profile-eyebrow">CARRERA ${hpEsc(raceNo)}</span><h2 id="profileName">${hpEsc(h.name)}</h2></div></div></header><div class="profile-metrics">${metrics.map(([k,v],i)=>`<div class="profile-metric ${i===0?'primary':''}"><span>${hpEsc(k)}</span><strong>${hpEsc(v)}</strong></div>`).join('')}</div>${hpHorseSections(h)}</div></div>`;
}
function fullCheckList(a){
 const horses=Array.isArray(a.horses)?a.horses:[];
 return `<div class="checklist-tools"><label>Buscar ejemplar<input class="checklist-search" type="search" placeholder="Número o nombre" aria-label="Buscar en el checklist"></label><span>${horses.length} ejemplares · abre una ficha</span></div><div class="checklist-horses">${horses.map(h=>`<details class="checklist-horse" data-checklist-name="${hpEsc((h.programNumber+' '+h.name).toLowerCase())}"><summary>${hpSaddle(h.programNumber)}<strong>${hpEsc(h.name)}</strong><span>HS ${hpScore(h)}</span></summary><div class="checklist-content">${hpHorseSections(h)}<button type="button" class="open-profile"${hpHorseAttrs(h)}>Abrir ficha completa ↗</button></div></details>`).join('')}</div>`;
}
// One delegated listener handles tables inserted inside profiles and checklists.
document.addEventListener('click',e=>{const b=e.target.closest('[data-sort-column]');if(!b)return;const th=b.closest('th'),table=b.closest('table'),body=table.tBodies[0],index=Number(b.dataset.sortColumn),ascending=th.getAttribute('aria-sort')!=='ascending';for(const h of table.querySelectorAll('th'))h.setAttribute('aria-sort','none');th.setAttribute('aria-sort',ascending?'ascending':'descending');const rows=[...body.rows];rows.sort((a,b)=>a.cells[index].textContent.localeCompare(b.cells[index].textContent,'es',{numeric:true})*(ascending?1:-1));body.append(...rows)});
document.addEventListener('input',e=>{if(!e.target.matches('.checklist-search'))return;const text=e.target.value.toLocaleLowerCase().trim();for(const row of e.target.closest('.inside').querySelectorAll('.checklist-horse'))row.hidden=!row.dataset.checklistName.includes(text)});
