
const DEFAULT_CORE_URL = ""; // set only when production Core exists
const CORE_KEY = "playershype.public.core.v1";
const FALLBACK_CHANNELS = {
  com:"https://playershype.com",
  net:"https://playershype.net",
  youtube:"https://youtube.com/@playershype1",
  tv:"",
  facebook:"",
  instagram:"",
  x:""
};
const FALLBACK_APP = {
  status:"preview",
  hero:{title:"No seguimos el hype. Lo creamos.",subtitle:"HypePredict, Player Live, PlayersHype TV y el contenido más reciente de PlayersHype en una sola experiencia."},
  tracks:[],
  modules:["hypepredict","playershype_tv","latest"],
  latest:[]
};
const $=id=>document.getElementById(id);
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove("show"),2200)}
function safeHttpsUrl(v){try{const u=new URL(String(v||"").trim());if(u.protocol!=="https:"||!u.hostname||u.username||u.password)return "";return u.toString().replace(/\/+$/,"/").replace(/\/$/,"")}catch{return ""}}
function normalizeUrl(v){return safeHttpsUrl(v)}
function resolveCoreUrl(){
  const params=new URLSearchParams(location.search);
  if(params.has("core")){
    const val=params.get("core");
    if(val==="clear"){localStorage.removeItem(CORE_KEY);return ""}
    const n=normalizeUrl(val);if(n)localStorage.setItem(CORE_KEY,n);return n
  }
  return normalizeUrl(localStorage.getItem(CORE_KEY)||DEFAULT_CORE_URL)
}
async function fetchManifest(coreUrl){
  if(!coreUrl)throw new Error("NO_CORE");
  const r=await fetch(coreUrl+"/api/public/manifest",{cache:"no-store"});
  if(!r.ok)throw new Error("CORE_HTTP_"+r.status);
  return r.json()
}
function channel(c,key,fallback=""){return (c&&c[key])||fallback}
function setHref(id,url,disabled=false){
  const el=$(id);if(!el)return;
  if(url&&!disabled){el.href=safeHttpsUrl(url)||"#";el.classList.remove("disabled")}else{el.href="#";el.classList.add("disabled")}
}
function renderTracks(tracks){
  const root=$("tracksGrid");
  if(!Array.isArray(tracks)||!tracks.length){
    root.innerHTML=`<div class="card empty" style="grid-column:1/-1">Todavía no hay hipódromos publicados desde el Core. Cuando el Admin publique una jornada aparecerá aquí automáticamente.</div>`;
    return
  }
  root.innerHTML=tracks.map((t,i)=>{
    const name=esc(t.name||t.track||`Track ${i+1}`),status=String(t.status||"ready").toLowerCase();
    const img=t.image?`background-image:linear-gradient(180deg,rgba(7,17,29,.12),rgba(5,15,24,.82)),url("${esc(t.image)}")`:"";
    const url="https://appassets.androidplatform.net/navigate/predict?track="+encodeURIComponent(t.id||t.name);
    const meta=[t.date,t.races?`${t.races} races`:null,t.updatedAt?`Updated ${t.updatedAt}`:null].filter(Boolean).join(" · ");
    const cls=status==="live"?"live":status==="ready"?"ready":"";
    const inner=`<div class="track-top"><span class="tag ${cls}">${esc(status.toUpperCase())}</span>${t.featured?'<span class="tag">FEATURED</span>':''}</div><div class="track-name">${name}</div><div class="track-meta">${esc(meta||"HypePredict")}</div>`;
    return url?`<a class="card track-card ${t.image?"with-image":""}" style="${img}" href="${esc(url)}" target="_blank" rel="noopener">${inner}</a>`:`<div class="card track-card ${t.image?"with-image":""}" style="${img}">${inner}</div>`
  }).join("")
}
function renderLatest(items,channels){
  const root=$("latestList");
  if(!Array.isArray(items)||!items.length){
    root.innerHTML=`<div class="empty">Todavía no hay piezas publicadas en el manifest. <a href="${esc(channel(channels,"com",FALLBACK_CHANNELS.com))}" target="_blank" rel="noopener" style="color:#67b7ea;font-weight:900">Abrir PlayersHype.com</a></div>`;
    return
  }
  root.innerHTML=items.slice(0,8).map(x=>`<a class="item" href="${esc(safeHttpsUrl(x.url||channel(channels,"com",FALLBACK_CHANNELS.com))||"#")}" target="_blank" rel="noopener"><div><b>${esc(x.title||"PlayersHype")}</b><small>${esc(x.description||x.type||"")}</small></div><span class="arrow">›</span></a>`).join("")
}
function render(data,mode){
  const app=data?.app||FALLBACK_APP,live=data?.live||null,channels={...FALLBACK_CHANNELS,...(data?.channels||{})},hp=data?.hypepredict?.active||null;
  $("heroTitle").textContent=app?.hero?.title||FALLBACK_APP.hero.title;
  $("heroSubtitle").textContent=app?.hero?.subtitle||FALLBACK_APP.hero.subtitle;
  $("hpVersion").textContent="VERSION "+(hp?.version||"—");
  $("footerMode").textContent=mode==="core"?"Connected to PlayersHype Core":"Preview local";
  $("coreStatusBtn").className="statusbtn "+(mode==="core"?"ok":"");
  $("coreStatusText").textContent=mode==="core"?"CORE":"PREVIEW";

  const liveStatus=String(live?.status||"offline").toLowerCase();
  $("liveKicker").textContent=liveStatus.toUpperCase();
  $("liveTitle").textContent=live?.track?`${live.track}${live?.race?" · "+live.race:""}`:"Player Live";
  $("liveText").textContent=live?.message|| (liveStatus==="live"?"Estamos en vivo.":"No hay transmisión publicada en este momento.");
  $("liveRevision").textContent=live?.revision||"—";
  $("coreStatusBtn").classList.toggle("live",liveStatus==="live");
  setHref("liveAction",live?.url||channels.tv||channels.youtube,liveStatus!=="live"&&!live?.url);

  setHref("trackHubLink",app?.trackHubUrl||"https://playershype.net/hypepredict-track-hub-1");
  setHref("hpOpen",app?.trackHubUrl||"https://playershype.net/hypepredict-track-hub-1");
  setHref("hpNet",channels.net||FALLBACK_CHANNELS.net);
  setHref("youtubeLinkTop",channels.youtube||FALLBACK_CHANNELS.youtube);
  setHref("tvAction",data?.app?.tv?.url||channels.tv||channels.youtube||FALLBACK_CHANNELS.youtube);
  setHref("comLinkTop",channels.com||FALLBACK_CHANNELS.com);

  if(app?.tv?.title)$("tvTitle").textContent=app.tv.title;
  if(app?.tv?.description)$("tvDescription").textContent=app.tv.description;

  renderTracks(app.tracks||[]);
  renderLatest(app.latest||[],channels)
}
async function boot(){
  render({app:FALLBACK_APP,channels:FALLBACK_CHANNELS},"preview");
  setHref("trackHubLink","https://appassets.androidplatform.net/navigate/predict");
  setHref("hpOpen","https://appassets.androidplatform.net/navigate/predict");
  try {
    const response=await fetch("/core/feed",{cache:"no-store"});if(!response.ok)throw new Error();
    const feed=await response.json();
    const tracks=feed.tracks.map(t=>{const cards=feed.cards.filter(c=>c.event.track===t.name||c.event.track===t.id).sort((a,b)=>b.event.date.localeCompare(a.event.date));const c=cards[0];return {...t,date:c?.event.date,races:c?.races.length,status:c?"cached":"pending"};});
    renderTracks(tracks);$("footerMode").textContent="Copia local · última jornada "+feed.latestDate;
  }catch{toast("No se pudo validar la copia local de jornadas");}
}
let currentRoute="home";
window.PlayersHypeRouter=Object.freeze({open(route){
  if(route==="predict"||route==="hypepredict"){location.href="/navigate/predict";return;}
  if(!["home","tracks","tv","latest"].includes(route))return;
  currentRoute=route;document.getElementById(route)?.scrollIntoView({behavior:"instant",block:"start"});
},back(){if(currentRoute==="home")return false;this.open("home");return true;}});
document.addEventListener("click",e=>{const a=e.target.closest("a");if(a?.getAttribute("href")==="#hypepredict"){e.preventDefault();location.href="/navigate/predict";}});
$("coreStatusBtn").addEventListener("click",()=>toast("Copia local de HypePredict · Core aún no configurado"));
boot();
