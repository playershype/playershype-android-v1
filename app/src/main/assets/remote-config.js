(function(){
  'use strict';
  if(window.__PLAYERSHYPE_REMOTE_RUNTIME__) return;
  window.__PLAYERSHYPE_REMOTE_RUNTIME__=true;

  const B=window.PlayersHypeConfig;
  const PATH=(location.pathname||'').toLowerCase();
  const isHome=PATH.endsWith('/index.html');
  const isTracks=PATH.endsWith('/tracks.html');
  const isPredict=PATH.endsWith('/predict.html');
  if(!B || !(isHome||isTracks||isPredict)) return;

  const STYLE_ID='ph-remote-style';
  const ROOT_ID='ph-remote-root';
  const BADGE_ID='ph-sync-badge';

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style'); s.id=STYLE_ID;
    s.textContent=`
      #${BADGE_ID}{position:fixed;z-index:2147483646;right:12px;top:max(10px,env(safe-area-inset-top));padding:7px 10px;border-radius:999px;background:#071a30;border:1px solid #244662;color:#9db3c8;font:800 10px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 6px 22px rgba(0,0,0,.28)}
      #${BADGE_ID}.ok{color:#b7ff39;border-color:#466b25} #${BADGE_ID}.bad{color:#ff9b9b;border-color:#6a3232} #${BADGE_ID}.cached{color:#ffd27a;border-color:#6d5729}
      #${ROOT_ID}{margin:18px 16px 92px;padding:18px;border-radius:22px;border:1px solid #1b3d5d;background:#07192b;color:#f5f9ff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 18px 45px rgba(0,0,0,.22)}
      #${ROOT_ID} *{box-sizing:border-box} #${ROOT_ID} .ph-kicker{font-size:11px;font-weight:900;letter-spacing:.12em;color:#21d7ff} #${ROOT_ID} h2{margin:7px 0 4px;font-size:25px;line-height:1.08} #${ROOT_ID} p{margin:5px 0;color:#9eb2c5;line-height:1.42}
      #${ROOT_ID} .ph-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0} #${ROOT_ID} .ph-metric{background:#041322;border:1px solid #1c3853;border-radius:14px;padding:11px} #${ROOT_ID} .ph-metric b{display:block;font-size:17px} #${ROOT_ID} .ph-metric span{display:block;margin-top:3px;color:#7f96ad;font-size:9px;font-weight:900;letter-spacing:.04em}
      #${ROOT_ID} .ph-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0} #${ROOT_ID} button,#${ROOT_ID} a.ph-btn{appearance:none;border:0;border-radius:12px;padding:11px 13px;background:#17314a;color:#59d8f5;font-weight:900;font-size:12px;text-decoration:none} #${ROOT_ID} button.ph-primary{background:#b7e600;color:#07111d}
      #${ROOT_ID} .ph-track{display:block;margin-top:9px;padding:13px;border:1px solid #1d3c59;border-radius:15px;background:#051526;color:inherit;text-decoration:none} #${ROOT_ID} .ph-track strong{display:block;font-size:16px} #${ROOT_ID} .ph-track small{display:block;margin-top:4px;color:#91a7bb}
      #${ROOT_ID} details{margin-top:10px;border:1px solid #1d3c59;border-radius:15px;background:#051526;overflow:hidden} #${ROOT_ID} summary{cursor:pointer;padding:13px;font-weight:900;list-style:none} #${ROOT_ID} summary::-webkit-details-marker{display:none} #${ROOT_ID} .ph-race-body{padding:0 13px 13px} #${ROOT_ID} .ph-hits{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0 10px} #${ROOT_ID} .ph-hit{padding:9px;border-radius:11px;background:#0a2238;border:1px solid #173b5a} #${ROOT_ID} .ph-hit span{display:block;color:#7f98af;font-size:9px;font-weight:900} #${ROOT_ID} .ph-hit b{display:block;margin-top:3px;font-size:12px}
      #${ROOT_ID} .ph-horse{display:grid;grid-template-columns:38px 1fr auto;gap:9px;align-items:start;padding:10px 0;border-bottom:1px solid #15324b;font-size:12px} #${ROOT_ID} .ph-horse:last-child{border-bottom:0} #${ROOT_ID} .ph-silk{width:34px;height:34px;border-radius:9px;border:2px solid rgba(255,255,255,.28);display:flex;align-items:center;justify-content:center;background:#17314a;font-weight:950;color:#fff} #${ROOT_ID} .ph-horse-main b{display:block} #${ROOT_ID} .ph-horse-main small{display:block;margin-top:3px;color:#8fa6ba;line-height:1.35} #${ROOT_ID} .ph-score{color:#b7ff39;font-weight:950;white-space:nowrap} #${ROOT_ID} .ph-rev{margin-top:12px;color:#6f8498;font:10px ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
      @media(max-width:430px){#${ROOT_ID} .ph-meta{grid-template-columns:1fr 1fr}#${ROOT_ID} .ph-hits{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }
  function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined&&text!==null)n.textContent=String(text);return n}
  function parseConfig(){try{const raw=B.getConfig();return raw?JSON.parse(raw):null}catch(e){return null}}
  function state(){try{return String(B.getSyncStatus()||'idle')}catch(e){return 'idle'}}
  function revision(){try{return String(B.getRevision()||'')}catch(e){return ''}}
  function lastSync(){try{return Number(B.getLastSync()||0)}catch(e){return 0}}
  function shortRev(r){if(!r)return 'SIN REV';return r.length>21?'…'+r.slice(-20):r}
  function ensureBadge(){let b=document.getElementById(BADGE_ID);if(!b){b=node('div','', 'SYNC · ESPERANDO');b.id=BADGE_ID;document.body.appendChild(b)}return b}
  function updateBadge(){const b=ensureBadge(),s=state(),r=revision();b.className='';if(s==='ok'){b.classList.add('ok');b.textContent='SYNC OK · '+shortRev(r)}else if(s==='cached'){b.classList.add('cached');b.textContent='SYNC CACHE · '+shortRev(r)}else if(s==='offline'){b.classList.add('bad');b.textContent='SYNC OFFLINE'}else{b.textContent='SYNC · '+s.toUpperCase()}}
  function mount(){let root=document.getElementById(ROOT_ID);if(!root){root=node('section');root.id=ROOT_ID;const nav=document.querySelector('nav');if(nav&&nav.parentNode)nav.parentNode.insertBefore(root,nav);else document.body.appendChild(root)}root.textContent='';return root}
  function metric(root,value,label){const m=node('div','ph-metric');m.appendChild(node('b','',value));m.appendChild(node('span','',label));root.appendChild(m)}
  function activeTracks(c){return (c.tracks||[]).filter(t=>{const d=c.raceDays&&c.raceDays[t.id];return d&&Array.isArray(d.races)&&d.races.length>0&&d.status!=='unpublished'})}
  function currentTrackId(c){const q=new URLSearchParams(location.search).get('track');if(q&&c.raceDays&&c.raceDays[q])return q;const lr=c.hypepredict&&c.hypepredict.latestReport;if(lr&&lr.trackId&&c.raceDays&&c.raceDays[lr.trackId])return lr.trackId;const a=activeTracks(c);return a.length?a[0].id:((c.tracks&&c.tracks[0]&&c.tracks[0].id)||'camarero')}
  function refreshButton(root){const a=node('div','ph-actions');const b=node('button','ph-primary','ACTUALIZAR AHORA');b.addEventListener('click',()=>{try{B.refresh()}catch(e){};updateBadge();b.textContent='ACTUALIZANDO…';setTimeout(()=>{b.textContent='ACTUALIZAR AHORA'},1800)});a.appendChild(b);root.appendChild(a)}
  function footer(root,c){const ls=lastSync();root.appendChild(node('div','ph-rev','revision: '+(c.revision||'No disponible')+(ls?' · sync: '+new Date(ls).toLocaleString():'')))}

  function renderHome(c){const root=mount(),active=activeTracks(c);root.appendChild(node('div','ph-kicker','REMOTE CONFIG'));root.appendChild(node('h2','',active.length?'PlayersHype actualizado':'PlayersHype conectado'));root.appendChild(node('p','',active.length?'La app está leyendo la publicación remota del Admin.':'Conectado al config remoto; no hay jornadas activas publicadas.'));const meta=node('div','ph-meta');metric(meta,active.length,'JORNADAS ACTIVAS');metric(meta,c.hypepredict&&c.hypepredict.version||'—','HYPEPREDICT');metric(meta,state()==='ok'?'OK':state().toUpperCase(),'SYNC');root.appendChild(meta);active.forEach(t=>{const d=c.raceDays[t.id];const a=node('a','ph-track');a.href='predict.html?track='+encodeURIComponent(t.id);a.appendChild(node('strong','',t.name));a.appendChild(node('small','',(d.date||'Sin fecha')+' · '+d.races.length+' carreras'));root.appendChild(a)});refreshButton(root);footer(root,c)}

  function renderTracks(c){
    // Track Hub is operational data, not a Stitch demo. Suppress every packaged
    // demo block and render only the canonical Admin publication.
    Array.from(document.body.children).forEach(el=>{
      if(el.id===ROOT_ID||el.id===BADGE_ID||el.tagName==='SCRIPT'||el.tagName==='NAV')return;
      el.style.display='none';
    });
    const root=mount();root.style.display='block';
    root.appendChild(node('div','ph-kicker','TRACK HUB · SINCRONIZADO'));
    root.appendChild(node('h2','','Track Hub'));
    root.appendChild(node('p','','Jornadas publicadas por PlayersHype Admin.'));
    const tracks=c.tracks||[];
    tracks.forEach(t=>{
      const d=(c.raceDays&&c.raceDays[t.id])||{status:'unpublished',date:null,races:[]};
      const races=Array.isArray(d.races)?d.races:[];
      const active=races.length>0&&d.status!=='unpublished';
      const card=node(active?'a':'div','ph-track');
      if(active)card.href='predict.html?track='+encodeURIComponent(t.id);
      card.appendChild(node('strong','',t.name));
      card.appendChild(node('small','',active?((d.date||'Sin fecha')+' · '+races.length+' carreras · '+d.status):'Jornada no publicada'));
      if(active){
        const a=(c.hypepredict&&c.hypepredict.analyses)||{};
        const published=races.map(r=>{let x=a[r.id];if(!x){for(const k of Object.keys(a)){if(a[k]&&a[k].raceId===r.id){x=a[k];break}}}return x}).filter(Boolean);
        const selectCount=published.filter(x=>x.quickHits&&x.quickHits.select).length;
        card.appendChild(node('small','',selectCount+' análisis HypePredict disponibles'));
      }
      root.appendChild(card);
    });
    refreshButton(root);footer(root,c)
  }

  function findAnalysis(c,race){const a=(c.hypepredict&&c.hypepredict.analyses)||{};if(a[race.id])return a[race.id];for(const k of Object.keys(a)){if(a[k]&&a[k].raceId===race.id)return a[k]}return null}
  function quickValue(q,key){const x=q&&q[key];if(!x)return 'No disponible';const n=x.programNumber!==undefined?'#'+x.programNumber+' ':'';return n+(x.name||'')}
  function horseProfile(c,h){const hd=c.horseData&&c.horseData[h.entryId];return hd&&hd.profile?hd.profile:{}}
  function explicitColor(uniform){const s=String(uniform||'').toLowerCase();const colors=[['rojo','#c62828'],['roja','#c62828'],['azul','#1565c0'],['amarillo','#f9a825'],['amarilla','#f9a825'],['verde','#2e7d32'],['negro','#111'],['negra','#111'],['blanco','#eee'],['blanca','#eee'],['naranja','#ef6c00'],['anaranjado','#ef6c00'],['anaranjada','#ef6c00'],['rosa','#ec407a'],['rosado','#ec407a'],['rosada','#ec407a'],['lila','#8e5bb7'],['morado','#6a1b9a'],['morada','#6a1b9a'],['violeta','#6a1b9a'],['gris','#757575'],['turquesa','#00a6a6'],['marrón','#6d4c41'],['marron','#6d4c41']];for(const x of colors)if(s.includes(x[0]))return x[1];return ''}
  function horseMeta(p){const bits=[];if(p.jockey)bits.push('Jinete: '+p.jockey);if(p.weight)bits.push('Peso: '+p.weight);if(p.trainer)bits.push('Entr.: '+p.trainer);if(p.paceProfile)bits.push('Perfil: '+p.paceProfile);return bits.join(' · ')}
  function renderPredict(c){const root=mount(),tid=currentTrackId(c),t=(c.tracks||[]).find(x=>x.id===tid)||{id:tid,name:tid},d=(c.raceDays&&c.raceDays[tid])||{status:'unpublished',date:null,races:[]};root.appendChild(node('div','ph-kicker','HYPEPREDICT · REMOTE CONFIG'));root.appendChild(node('h2','',t.name));root.appendChild(node('p','',d.date?('Jornada '+d.date+' cargada desde el config remoto.'):'No hay jornada publicada para este hipódromo.'));const meta=node('div','ph-meta');metric(meta,d.date||'—','FECHA');metric(meta,Array.isArray(d.races)?d.races.length:0,'CARRERAS');metric(meta,state()==='ok'?'OK':state().toUpperCase(),'SYNC');root.appendChild(meta);
    const races=Array.isArray(d.races)?d.races:[];
    races.forEach(r=>{const a=findAnalysis(c,r),q=a&&a.quickHits,hs=(a&&Array.isArray(a.horses)?a.horses.slice():[]).sort((x,y)=>(Number(y.hypeScore)||0)-(Number(x.hypeScore)||0));const det=node('details');const select=q&&q.select;const leader=select?quickValue(q,'select'):(hs[0]?('#'+hs[0].programNumber+' '+hs[0].name):'Sin Select');const score=hs.find(h=>select&&h.entryId===select.entryId)?.hypeScore ?? (hs[0]&&hs[0].hypeScore);det.appendChild(node('summary','',`R${r.number} · ${leader}${score!==undefined?' · '+score:''}`));const body=node('div','ph-race-body');const hits=node('div','ph-hits');[['Select','select'],['Rival','rival'],['Tapada','sleeper'],['Huevazo','valuePlay']].forEach(([label,key])=>{const h=node('div','ph-hit');h.appendChild(node('span','',label.toUpperCase()));h.appendChild(node('b','',quickValue(q,key)));hits.appendChild(h)});body.appendChild(hits);if(hs.length){hs.forEach(h=>{const p=horseProfile(c,h),row=node('div','ph-horse'),silk=node('div','ph-silk','#'+(h.programNumber||'')),main=node('div','ph-horse-main'),title=node('b','',`${h.name||''}${h.role?' · '+h.role:''}`),meta=node('small','',horseMeta(p)),uniform=node('small','',p.uniform?'Uniforme: '+p.uniform:'Uniforme: No disponible'),right=node('span','ph-score',Number.isFinite(Number(h.hypeScore))?Number(h.hypeScore).toFixed(1):'—');const col=explicitColor(p.uniform);if(col){silk.style.background=col;if(col==='#eee'||col==='#f9a825')silk.style.color='#07111d'}main.appendChild(title);if(meta.textContent)main.appendChild(meta);main.appendChild(uniform);row.appendChild(silk);row.appendChild(main);row.appendChild(right);body.appendChild(row)})}else body.appendChild(node('p','','Análisis detallado no disponible para esta carrera.'));det.appendChild(body);root.appendChild(det)});
    refreshButton(root);footer(root,c)
  }

  function render(){addStyle();updateBadge();const c=parseConfig();if(!c){const root=mount();root.appendChild(node('div','ph-kicker','REMOTE CONFIG'));root.appendChild(node('h2','','Sincronizando…'));root.appendChild(node('p','','Esperando una copia válida de main/docs/app/config.json.'));refreshButton(root);return}if(isHome)renderHome(c);else if(isTracks)renderTracks(c);else if(isPredict&&typeof window.PlayersHypeDashboardRender!=='function')renderPredict(c)}

  window.onPlayersHypeConfigState=function(){render();if(isPredict&&typeof window.PlayersHypeDashboardRender==='function')window.PlayersHypeDashboardRender()};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateBadge()});
  if(!isPredict)render();else{addStyle();updateBadge();}
})();
