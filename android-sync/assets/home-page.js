// Embedded in the Home closure by apply_home.py. No new network requests.
function homeToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Puerto_Rico',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function homeTracks(c){
 const date=homeToday(),items=Array.isArray(c.tracks)?c.tracks:[];
 if(c.homeDate===date)return items.filter(t=>t.date===date&&Number.isInteger(t.publishedRaces)&&t.publishedRaces>0);
 // Older compact projections lack publication metadata. Never relabel registered tracks as today's card.
 if(!c.raceDays||!c.hypepredict?.analyses)return [];
 return items.flatMap(t=>{const raw=c.raceDays[t.id],days=Array.isArray(raw)?raw:Array.isArray(raw?.days)?raw.days:raw?[raw]:[],day=days.find(d=>d.date===date),count=(day?.races||[]).filter(r=>c.hypepredict.analyses[r.id]?.status==='published').length;return count?[{...t,date,publishedRaces:count}]:[]});
}
function homeTrackHref(t){return '/navigate/predict?track='+encodeURIComponent(t.id||'')}
function homeTarget(target){
 if(target==='featured')return '#destacado';
 if(target==='home')return '#home';
 if(['tv','live','tracks','latest'].includes(target)&&config?.home?.enabled?.[target]===false)return '';
 if(target==='tv'&&config?.tv?.enabled===false||target==='live'&&config?.live?.enabled===false)return '';
 return hrefTarget(target);
}
function homeHeroLink(el,cta,fallback){const target=homeTarget(cta?.target||fallback);el.textContent=cta?.label||'';el.hidden=!String(cta?.label||'').trim()||(el.id.startsWith('featured')&&target==='#destacado');setLink(el,target,target==='#'||!target);el.setAttribute('aria-disabled',String(!target||target==='#'))}
function renderHero(c){
 const h=c.home?.hero||{};
 $('heroEyebrow').textContent=h.eyebrow||'PLAYERSHYPE NETWORK';$('heroTitle').textContent=h.title||DEFAULT_CONFIG.home.hero.title;$('heroSubtitle').textContent=h.subtitle||'';
 $('heroImage').src=safeImage(h.image,'/assets/media/hero-racing.jpg');
 homeHeroLink($('heroPrimary'),h.primary,'predict');homeHeroLink($('heroSecondary'),h.secondary,'tv');
 $('heroOpen').setAttribute('aria-label','Abrir destacado: '+(h.page?.title||h.title||'PlayersHype'));
}
function renderFeatured(c){
 const h=c.home?.hero||{};
 $('featuredEyebrow').textContent=h.eyebrow||'PLAYERSHYPE';$('featuredTitle').textContent=h.page?.title||h.title||'PlayersHype';
 $('featuredImage').src=safeImage(h.image,'/assets/media/hero-racing.jpg');
 const body=String(h.page?.body||h.subtitle||'');$('featuredBody').innerHTML=body.split(/\n\s*\n/).filter(Boolean).map(p=>'<p>'+esc(p)+'</p>').join('');
 homeHeroLink($('featuredPrimary'),h.primary,'predict');homeHeroLink($('featuredSecondary'),h.secondary,'tv');
}
function renderHomePulse(c){
 const tracks=homeTracks(c),count=tracks.reduce((n,t)=>n+t.publishedRaces,0),date=homeToday();
 $('pulseDate').textContent=new Intl.DateTimeFormat('es-PR',{timeZone:'America/Puerto_Rico',weekday:'long',day:'numeric',month:'long'}).format(new Date(date+'T12:00:00-04:00'));
 $('pulseState').textContent=count?'ANÁLISIS PUBLICADOS':'SIN ANÁLISIS PARA HOY';
 $('pulseCount').textContent=String(count);$('pulseTracksCount').textContent=tracks.length+' '+(tracks.length===1?'hipódromo':'hipódromos');
 $('pulseTrackLinks').innerHTML=tracks.map(t=>'<a href="'+esc(homeTrackHref(t))+'"><span class="pulse-dot" aria-hidden="true"></span>'+esc(t.name)+' <b>'+t.publishedRaces+'</b><span aria-hidden="true">↗</span></a>').join('');
 $('pulseEmpty').hidden=count>0;
 const liveOn=c.home?.enabled?.live!==false&&c.live?.enabled!==false,live=liveOn&&c.live?.status==='live';
 $('pulseLive').textContent=live?'Player Live · EN VIVO':liveOn&&c.live?.status==='scheduled'?'Player Live · Programado':'Player Live · Sin transmisión en vivo';
 const url=liveOn?(safeUrl(c.live?.url)||safeUrl(c.channels?.youtube)):'';setLink($('pulseLive'),url,!url);$('pulseLive').classList.toggle('on-air',live);
}
function renderTracks(){
 const items=homeTracks(config);
 $('tracksGrid').innerHTML=items.length?items.map(t=>'<a class="track" href="'+esc(homeTrackHref(t))+'"><img loading="lazy" decoding="async" src="'+esc(safeImage(t.image,'/assets/media/track-gulfstream.jpg'))+'" alt=""><div class="track-body"><span class="chip ready">ANÁLISIS PUBLICADOS</span><div class="track-name">'+esc(t.name)+'</div><div class="track-meta">'+t.publishedRaces+' análisis · '+esc(t.date)+'</div></div></a>').join(''):'<div class="card empty">Hoy no hay análisis publicados. Puedes consultar otras fechas en el Track Hub.</div>';
}
var homeReturnFocus=null;
function homeApplyPage(){
 const featured=location.hash==='#destacado';$('heroPage').hidden=!featured;document.body.classList.toggle('home-featured-open',featured);
 if(featured){currentRoute='featured';$('featuredTitle').focus();window.scrollTo(0,0)}
 else if(currentRoute==='featured'){currentRoute='home';if(homeReturnFocus?.isConnected)homeReturnFocus.focus();}
}
window.PlayersHypeRouter=Object.freeze({
 open(route){
  if(route==='predict'||route==='hypepredict'){location.href='/navigate/predict';return}
  if(route==='featured'){homeReturnFocus=document.activeElement;location.hash='destacado';return}
  if(!['home','tracks','tv','live','latest'].includes(route))return;
  const wasFeatured=location.hash==='#destacado';
  if(wasFeatured){history.replaceState(null,'',location.pathname+location.search+'#'+route);homeApplyPage()}
  currentRoute=route;document.getElementById(route)?.scrollIntoView({behavior:'instant',block:'start'});
 },
 back(){if(currentRoute==='home'&&location.hash!=='#destacado')return false;this.open('home');return true}
});
window.addEventListener('hashchange',homeApplyPage);
document.addEventListener('click',e=>{
 const a=e.target.closest('a');if(!a)return;
 if(a.getAttribute('aria-disabled')==='true'){e.preventDefault();return}
 if(a.getAttribute('href')==='#destacado')homeReturnFocus=a;
 if(a.id==='featuredBack'){e.preventDefault();PlayersHypeRouter.open('home');return}
 if(['#home','#tv','#live','#tracks','#latest'].includes(a.getAttribute('href'))){e.preventDefault();PlayersHypeRouter.open(a.getAttribute('href').slice(1))}
});
