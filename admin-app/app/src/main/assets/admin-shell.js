(()=>{
if(window.__phAdminShell)return;window.__phAdminShell=true;
const style=document.createElement('style');style.textContent=`
.ph-shell{position:sticky;top:0;z-index:50;margin:14px -18px 0;padding:10px 18px;background:rgba(3,19,38,.97);border-bottom:1px solid #1b344d;overflow-x:auto;white-space:nowrap}
.ph-shell button{display:inline-block;width:auto;padding:10px 13px;margin-right:7px;border-radius:12px;background:#12273b;color:#9fb0c1;font-size:11px}
.ph-shell button.on{background:#b7e600;color:#07111d}
.ph-module{display:none}.ph-module.on{display:block}
.ph-roadmap{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}.ph-roadmap div{padding:12px;border-radius:13px;background:#071727;border:1px solid #203b55}.ph-roadmap b{display:block;font-size:12px}.ph-roadmap span{font-size:10px;color:#8fa0b2}.ph-field{display:block;margin:11px 0}.ph-field span{display:block;margin-bottom:5px;color:#8fa0b2;font-size:10px;font-weight:800}.ph-field input{width:100%;padding:12px;border:1px solid #29445d;border-radius:11px;background:#071727;color:#fff}
`;document.head.appendChild(style);
const body=document.body,hero=document.querySelector('.hero'),ready=document.querySelector('#readyCard');
if(!hero||!ready)return;
const hp=document.createElement('div');hp.id='mod-hypepredict';hp.className='ph-module on';hero.parentNode.insertBefore(hp,hero);hp.append(hero,ready);
const defs=[
['inicio','Inicio','Mapa maestro y estado del Control Center.'],
['hypepredict','HypePredict','Jornada, carreras, ejemplares y publicación.'],
['trackhub','Track Hub','Hipódromos, fotos, nombres ES/EN, visibilidad y orden.'],
['tv','TV','Canal, programas y destinos de PlayersHype TV.'],
['live','Live','Estado, señal, URL, imagen y mensaje de Player Live.'],
['latest','Novedades','Noticias, avisos, imágenes, CTA y prioridad.'],
['manada','La Manada','Membresías, precios, beneficios y CTA.'],
['store','Tienda','Catálogo, productos, imágenes, precios y disponibilidad.'],
['network','Network','PlayersHype.com, PlayersHype.net, redes, promociones y sponsors.'],
['publish','Publicar','Preview, validación, revisión, publicación y recuperación.'],
['settings','Config','Idioma, módulos y configuración general.']
];
const nav=document.createElement('nav');nav.className='ph-shell';
function card(id,title,desc){const s=document.createElement('section');s.id='mod-'+id;s.className='card ph-module';s.innerHTML='<p class="readyTitle">'+title+'</p><p>'+desc+'</p><div class="status">MÓDULO REGISTRADO · pendiente de completar y validar end-to-end.</div>';body.appendChild(s);return s}
const home=card('inicio','Admin Control Center','Mapa completo del ecosistema. Ningún módulo se considerará DONE hasta probar Admin → config → User App → teléfono.');
home.querySelector('.status').outerHTML='<div class="ph-roadmap">'+defs.slice(1).map(x=>'<div><b>'+x[1]+'</b><span>'+x[2]+'</span></div>').join('')+'</div>';
for(const d of defs){if(d[0]!=='inicio'&&d[0]!=='hypepredict')card(...d)}

function phDraft(){try{return JSON.parse(localStorage.getItem('playershypeAdminDraft')||'{}')}catch(e){return {}}}
function phSave(section,data){const d=phDraft();d[section]=data;localStorage.setItem('playershypeAdminDraft',JSON.stringify(d));if(typeof status==='function')status(section.toUpperCase()+' GUARDADO EN BORRADOR.','ok')}
function phInput(id,label,value){return '<label class="ph-field"><span>'+label+'</span><input id="'+id+'" value="'+String(value||'').replace(/"/g,'&quot;')+'"></label>'}
const tv=document.getElementById('mod-tv');if(tv){const d=phDraft().tv||{};tv.innerHTML='<p class="readyTitle">PlayersHype TV</p>'+phInput('tvUrl','CANAL / PLAYLIST',d.url||'')+phInput('tvFeatured','DESTACADO',d.featuredUrl||'')+'<button id="tvSave">GUARDAR TV</button>';tv.querySelector('#tvSave').onclick=()=>phSave('tv',{url:tv.querySelector('#tvUrl').value.trim(),featuredUrl:tv.querySelector('#tvFeatured').value.trim()})}
const live=document.getElementById('mod-live');if(live){const d=phDraft().live||{};live.innerHTML='<p class="readyTitle">PlayersHype Live</p>'+phInput('liveTitle','TÍTULO',d.title||'Player Live')+phInput('liveUrl','URL LIVE',d.url||'')+phInput('liveMsg','MENSAJE',d.message||'')+'<button id="liveSave">GUARDAR LIVE</button>';live.querySelector('#liveSave').onclick=()=>phSave('live',{title:live.querySelector('#liveTitle').value.trim(),url:live.querySelector('#liveUrl').value.trim(),message:live.querySelector('#liveMsg').value.trim()})}
const network=document.getElementById('mod-network');if(network){const d=phDraft().channels||{};network.innerHTML='<p class="readyTitle">PlayersHype Network</p>'+phInput('netCom','PLAYERSHYPE.COM',d.com||'')+phInput('netNet','PLAYERSHYPE.NET',d.net||'')+phInput('netYt','YOUTUBE',d.youtube||'')+phInput('netFb','FACEBOOK',d.facebook||'')+phInput('netIg','INSTAGRAM',d.instagram||'')+phInput('netX','X / TWITTER',d.x||'')+'<button id="netSave">GUARDAR NETWORK</button>';network.querySelector('#netSave').onclick=()=>phSave('channels',{com:network.querySelector('#netCom').value.trim(),net:network.querySelector('#netNet').value.trim(),youtube:network.querySelector('#netYt').value.trim(),facebook:network.querySelector('#netFb').value.trim(),instagram:network.querySelector('#netIg').value.trim(),x:network.querySelector('#netX').value.trim()})}

const pub=document.getElementById('mod-publish');if(pub){pub.innerHTML='<p class="readyTitle">Publication Center</p><p>Guarda una copia real del paquete antes o después de publicar. Estos archivos se descargan al teléfono.</p><div class="actions"><button class="secondary" id="phSaveJson">DESCARGAR CONFIG.JSON</button><button class="secondary" id="phSaveHtml">DESCARGAR INDEX.HTML</button></div><div class="status">EXPORTACIÓN LOCAL · no publica ni toca main.</div>';const dl=(name,type,data)=>{if(window.HypeAndroid&&typeof window.HypeAndroid.exportFile==='function'){if(!window.HypeAndroid.exportFile(name,type,data))throw new Error('Android no pudo guardar el archivo en Descargas.');return}const b=new Blob([data],{type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),800)};pub.querySelector('#phSaveJson').onclick=()=>{try{if(!readyCandidate&&typeof buildCandidate==='function')readyCandidate=buildCandidate();if(!readyCandidate)throw new Error('No hay paquete preparado.');dl('playershype-config-'+new Date().toISOString().slice(0,10)+'.json','application/json',JSON.stringify(readyCandidate,null,2)+'\n');if(typeof status==='function')status('CONFIG.JSON DESCARGADO AL TELÉFONO.','ok')}catch(e){if(typeof status==='function')status(e.message,'bad')}};pub.querySelector('#phSaveHtml').onclick=()=>{try{if(!readyCandidate&&typeof buildCandidate==='function')readyCandidate=buildCandidate();if(!readyCandidate)throw new Error('No hay paquete preparado.');const payload=JSON.stringify(readyCandidate).replace(/</g,'\\u003c');const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PlayersHype Config Backup</title></head><body><h1>PlayersHype Config Backup</h1><p>Archivo de respaldo generado por Admin V0.1.</p><script id="playershype-config" type="application/json">'+payload+'<\\/script></body></html>';dl('playershype-index-'+new Date().toISOString().slice(0,10)+'.html','text/html',html);if(typeof status==='function')status('INDEX.HTML DESCARGADO AL TELÉFONO.','ok')}catch(e){if(typeof status==='function')status(e.message,'bad')}}}

defs.forEach(d=>{const b=document.createElement('button');b.textContent=d[1];b.dataset.mod=d[0];b.onclick=()=>{document.querySelectorAll('.ph-module').forEach(x=>x.classList.remove('on'));document.querySelectorAll('.ph-shell button').forEach(x=>x.classList.remove('on'));const t=document.querySelector('#mod-'+d[0]);if(t)t.classList.add('on');b.classList.add('on');window.scrollTo(0,0)};nav.appendChild(b)});
body.insertBefore(nav,hp);nav.querySelector('[data-mod="hypepredict"]').classList.add('on');if(window.phTrackHubMount)window.phTrackHubMount();
window.phAdminModules=defs.map(x=>x[0]);
})();