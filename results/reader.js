/* Read-only official results. Never write to DATA or a pre-race analysis. */
window.HPResults=(()=>{
 const gateway='https://hypepredict-results.players-hype1.workers.dev/results',source='https://www.hipodromo-camarero.com/resultados/locales',prefix='playershype.officialResults.v1.';
 let date='',current=null,timer=null,flight=null,sequence=0,returnFocus=null;
 const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Puerto_Rico',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 function validDate(v){return /^20\d{2}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v}
 function validate(p,wanted){
  if(!p||p.ok!==true||p.date!==wanted||!['camarero','cmr','hipodromo camarero'].includes(String(p.track||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())||!Array.isArray(p.races)||p.races.length>32)throw Error('La respuesta no corresponde a Camarero y la fecha solicitada.');
  const seen=new Set();for(const r of p.races){if(!r||!Number.isInteger(r.raceNumber)||r.raceNumber<1||r.raceNumber>32||seen.has(r.raceNumber))throw Error('Carrera inválida o duplicada.');seen.add(r.raceNumber);if(r.top4&&(!Array.isArray(r.top4)||r.top4.length>32))throw Error('Orden de llegada inválido.');for(const h of r.top4||[]){if(!h||typeof h!=='object'||!Number.isInteger(h.position)||h.position<1||h.position>32)throw Error('Puesto inválido.')}if(r.payout&&(typeof r.payout!=='object'||Array.isArray(r.payout)||Object.keys(r.payout).length>40))throw Error('Pagos inválidos.');}
  return p;
 }
 function cached(){try{const raw=localStorage.getItem(prefix+date);if(!raw||raw.length>1048576)return null;return validate(JSON.parse(raw),date)}catch{return null}}
 function save(p){try{localStorage.setItem(prefix+date,JSON.stringify(p));const keys=Object.keys(localStorage).filter(k=>k.startsWith(prefix)).sort().reverse();for(const k of keys.slice(30))localStorage.removeItem(k)}catch{/* Results remain visible when storage is full. */}}
 function stop(){if(timer)clearInterval(timer);timer=null;sequence++;if(flight)flight.controller.abort();flight=null;close()}
 function time(p){const d=new Date(p?.updatedAt||'');return Number.isNaN(d.getTime())?'Hora no informada por la fuente':new Intl.DateTimeFormat('es-PR',{timeZone:'America/Puerto_Rico',dateStyle:'short',timeStyle:'short'}).format(d)+' · Puerto Rico'}
 function name(w){return String(w?.name||w?.horse||'')}
 function paint(message='',failed=false){
  const root=document.getElementById('hpResults');if(!root)return;
  const rows=(current?.races||[]).slice().sort((a,b)=>a.raceNumber-b.raceNumber),count=rows.filter(r=>name(r.winner)).length;
  root.querySelector('#resultsState').textContent=failed?(current?'SIN CONEXIÓN · COPIA GUARDADA':'CONEXIÓN NO DISPONIBLE'):current?(count+' RESULTADOS PUBLICADOS'):'CONSULTANDO';
  root.querySelector('#resultsNote').textContent=message||('Consultado para '+date+'. Actualización automática cada 2 minutos mientras esta pantalla esté abierta.');
  root.querySelector('#resultsUpdated').textContent=current?'Actualización de la fuente: '+time(current):'Esperando respuesta de la fuente.';
  root.querySelector('#resultsGrid').innerHTML=rows.length?rows.map(r=>'<button type="button" class="result-card" data-result-race="'+r.raceNumber+'" '+(!name(r.winner)?'disabled':'')+'><span class="result-race">R'+r.raceNumber+'</span><span class="result-copy"><small>'+(!name(r.winner)?'PENDIENTE':'GANADOR PUBLICADO')+'</small><strong>'+e(r.winner?.programNumber?'#'+r.winner.programNumber+' ':'')+e(name(r.winner)||'Esperando resultado')+'</strong><span>'+(name(r.winner)?'Ver orden de llegada y pagos →':'Aún no publicado')+'</span></span><span class="result-pay">'+e(r.payout?.win||'—')+'<small>A ganador</small></span></button>').join(''):'<div class="results-empty">'+(failed?'No se pudieron consultar los resultados. Puedes reintentar o abrir la fuente oficial.':'Todavía no hay resultados publicados para esta fecha.')+'</div>';
 }
 async function refresh(){
  if(!document.getElementById('hpResults')||document.hidden)return;
  if(flight&&flight.date===date)return flight.promise;
  const requested=date,id=++sequence,controller=new AbortController();let deadline;
  const task=(async()=>{try{
   const root=document.getElementById('hpResults');if(root)root.querySelector('#resultsRefresh').disabled=true;
   deadline=setTimeout(()=>controller.abort(),20000);
   const url=location.hostname==='appassets.androidplatform.net'?'/core/results?track=CMR&date='+requested:gateway+'?track=CMR&date='+requested;
   const response=await fetch(url,{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('El servicio no respondió ('+response.status+').');
   const text=await response.text();if(text.length>1048576)throw Error('Respuesta demasiado grande.');const payload=validate(JSON.parse(text),requested);
   if(id!==sequence||date!==requested||!document.getElementById('hpResults'))return;
   current=payload;save(payload);paint();
  }catch(error){if(id===sequence&&date===requested&&document.getElementById('hpResults'))paint(current?'Se conserva la última copia de '+requested+'. No se muestran resultados de otra fecha.':'No fue posible consultar la fuente para '+requested+'. Pulsa Actualizar o abre Resultados Camarero.',true);
  }finally{clearTimeout(deadline);if(id===sequence){flight=null;const b=document.getElementById('resultsRefresh');if(b)b.disabled=false}}})();
  flight={date:requested,controller,promise:task};return task;
 }
 function close(){const m=document.getElementById('resultModal');if(m){m.remove();document.body.style.overflow='';if(returnFocus?.isConnected)returnFocus.focus();returnFocus=null}}
 function detail(number){
  const row=current?.races.find(r=>r.raceNumber===number);if(!row||!name(row.winner))return;
  close();returnFocus=document.querySelector('[data-result-race="'+number+'"]');
  const order=Array.isArray(row.top4)?row.top4.slice().sort((a,b)=>Number(a.position)-Number(b.position)):[];
  const labels={win:'A ganador',place:'Place',show:'Show',exacta:'Exacta',quiniela:'Quiniela',trifecta:'Trifecta',superfecta:'Superfecta',dailyDouble:'Dupleta',pick3:'Pick 3',pick4:'Pick 4',pick5:'Pick 5',pick6:'Pool 6'};
  const pays=Object.entries(row.payout||{}).filter(([k,v])=>k!=='raw'&&v!==null&&v!==undefined&&String(v).trim()&&typeof v!=='object');
  const m=document.createElement('aside');m.id='resultModal';m.className='result-modal';m.innerHTML='<section class="result-dialog" role="dialog" aria-modal="true" aria-labelledby="resultTitle" tabindex="-1"><header><div><small>CAMARERO · '+e(date)+'</small><h2 id="resultTitle">R'+number+' · Resultado publicado</h2></div><button type="button" id="resultClose" aria-label="Cerrar resultado">×</button></header><div class="result-dialog-body"><h3>Orden de llegada</h3>'+(order.length?'<div class="results-table-wrap"><table><caption class="profile-sr">Orden publicado por la fuente</caption><thead><tr><th>Puesto</th><th>N.º</th><th>Ejemplar / jinete</th></tr></thead><tbody>'+order.map(h=>'<tr><td>'+e(h.position??'—')+'</td><td>'+e(h.programNumber??'—')+'</td><td><strong>'+e(name(h))+'</strong><small>'+e(h.jockey||'')+'</small></td></tr>').join('')+'</tbody></table></div>':'<p>La fuente no publicó el orden de llegada.</p>')+'<h3>Pagos disponibles</h3>'+(pays.length?'<dl class="results-pays">'+pays.map(([k,v])=>'<div><dt>'+e(labels[k]||k)+'</dt><dd>'+e(v)+(/\[\s*\]/.test(String(v))?'<small>Dato incompleto en la fuente</small>':'')+'</dd></div>').join('')+'</dl>':'<p>La fuente todavía no publicó pagos.</p>')+'<p class="results-source">Fuente: '+e(row.source||'Hipódromo Camarero')+' · '+e(time(current))+'. Se muestran los datos recibidos; no se completan pagos ni puestos ausentes.</p><a class="results-source-link" href="'+source+'" target="_blank" rel="noopener noreferrer">Ver fuente oficial ↗</a></div></section>';
  document.body.appendChild(m);document.body.style.overflow='hidden';m.querySelector('#resultClose').onclick=close;m.onclick=event=>{if(event.target===m)close()};m.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();close()}if(event.key==='Tab'){const f=[...m.querySelectorAll('button,a[href]')],first=f[0],last=f[f.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}};m.querySelector('#resultClose').focus();
 }
 function mount(initial){stop();if(!validDate(date)){const wanted=new URLSearchParams(location.search).get('resultsDate');date=validDate(wanted||'')?wanted:validDate(initial)?initial:today();}current=cached();
  document.getElementById('app').innerHTML='<section class="results-screen" id="hpResults"><header class="results-heading"><div><span class="results-kicker">PLAYERSHYPE · RESULTADOS</span><h2>Resultados oficiales</h2><p>Camarero · orden de llegada y pagos publicados</p></div><span id="resultsState" role="status">CONSULTANDO</span></header><div class="results-controls"><div><label for="resultsTrack">Hipódromo</label><select id="resultsTrack"><option value="CMR">Camarero</option></select></div><div><label for="resultsDate">Fecha de resultados</label><input id="resultsDate" type="date" value="'+e(date)+'"></div><button id="resultsRefresh" type="button">Actualizar resultados</button></div><p id="resultsNote" role="status"></p><p id="resultsUpdated"></p><div class="results-grid" id="resultsGrid"></div><footer class="results-foot"><a class="results-source-link" href="'+source+'" target="_blank" rel="noopener noreferrer">Resultados Camarero ↗</a><p>Conexión automática disponible para Camarero. El análisis pre-carrera y los HypeScores permanecen intactos.</p></footer></section>';
  document.getElementById('resultsDate').onchange=event=>{const next=event.target.value;if(!validDate(next))return;stop();date=next;const url=new URL(location.href);url.searchParams.set('resultsDate',date);history.replaceState(null,'',url);current=cached();paint();refresh();startTimer()};document.getElementById('resultsRefresh').onclick=refresh;document.getElementById('resultsGrid').onclick=event=>{const b=event.target.closest('[data-result-race]');if(b&&!b.disabled)detail(Number(b.dataset.resultRace))};paint();refresh();startTimer();
 }
 function startTimer(){if(timer)clearInterval(timer);if(!document.hidden)timer=setInterval(refresh,120000)}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(document.getElementById('hpResults')){refresh();startTimer()}});
 function resume(){if(document.getElementById('hpResults')){refresh();startTimer()}}
 return Object.freeze({mount,stop,refresh,resume,validate,validDate,detail,close});
})();
