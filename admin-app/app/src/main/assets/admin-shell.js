(()=>{
if(window.__phAdminShell)return;window.__phAdminShell=true;
const style=document.createElement('style');style.textContent=`
.ph-shell{position:sticky;top:0;z-index:50;margin:14px -18px 0;padding:10px 18px;background:rgba(3,19,38,.97);border-bottom:1px solid #1b344d;overflow-x:auto;white-space:nowrap}
.ph-shell button{display:inline-block;width:auto;padding:10px 13px;margin-right:7px;border-radius:12px;background:#12273b;color:#9fb0c1;font-size:11px}
.ph-shell button.on{background:#b7e600;color:#07111d}
.ph-module{display:none}.ph-module.on{display:block}
.ph-roadmap{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}.ph-roadmap div{padding:12px;border-radius:13px;background:#071727;border:1px solid #203b55}.ph-roadmap b{display:block;font-size:12px}.ph-roadmap span{font-size:10px;color:#8fa0b2}
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
defs.forEach(d=>{const b=document.createElement('button');b.textContent=d[1];b.dataset.mod=d[0];b.onclick=()=>{document.querySelectorAll('.ph-module').forEach(x=>x.classList.remove('on'));document.querySelectorAll('.ph-shell button').forEach(x=>x.classList.remove('on'));const t=document.querySelector('#mod-'+d[0]);if(t)t.classList.add('on');b.classList.add('on');window.scrollTo(0,0)};nav.appendChild(b)});
body.insertBefore(nav,hp);nav.querySelector('[data-mod="hypepredict"]').classList.add('on');if(window.phTrackHubMount)window.phTrackHubMount();
window.phAdminModules=defs.map(x=>x[0]);
})();