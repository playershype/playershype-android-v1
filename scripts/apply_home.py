"""Upgrade the retained native Home and Admin together; no published content edits."""
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]

PULSE='''<section class="home-pulse" aria-label="Jornada publicada"><div class="pulse-top"><div><span class="pulse-kicker">LA JORNADA · PLAYERSHYPE</span><div id="pulseDate" class="pulse-date"></div></div><span class="pulse-sport">HIPISMO</span></div><div class="pulse-summary"><span id="pulseCount" class="pulse-total">0</span><div><strong id="pulseState">CONSULTANDO</strong><small id="pulseTracksCount"></small></div></div><div id="pulseTrackLinks" class="pulse-track-links"></div><p id="pulseEmpty" class="pulse-empty" hidden>Cuando publiques análisis para hoy, aparecerán aquí. <a href="/navigate/predict">Consultar otras fechas →</a></p><a id="pulseLive" class="pulse-live"></a></section>'''
PAGE='''<section id="heroPage" class="featured-page" hidden><a id="featuredBack" class="featured-back" href="#home">← Volver al Inicio</a><img id="featuredImage" class="featured-image" alt="" decoding="async"><article class="featured-copy"><div id="featuredEyebrow" class="eyebrow"></div><h1 id="featuredTitle" tabindex="-1"></h1><div id="featuredBody" class="featured-body"></div><div class="hero-actions"><a id="featuredPrimary" class="btn primary"></a><a id="featuredSecondary" class="btn"></a></div></article></section>'''

def replace_function(script,name,next_name):
    start=script.index('function '+name+'(')
    end=script.index('\nfunction '+next_name+'(',start)
    return script[:start]+script[end:]

def apply(source):
    r=Path(source)
    user=r/'app-user/src/main/assets'
    js=(user/'home.js').read_text()
    if '// HOME_PAGE_INSTALLED' in js:
        raise RuntimeError('Home overlay already installed; expand clean source first')
    for a,b in [('renderHero','statusClass'),('renderTracks','renderLive')]:js=replace_function(js,a,b)
    start=js.index('window.PlayersHypeRouter=')
    end=js.index('\ndocument.addEventListener',start)
    js=js[:start]+(ROOT/'android-sync/assets/home-page.js').read_text()+js[end:]
    js=js.replace('renderSocial(c);', 'renderSocial(c);renderFeatured(c);renderHomePulse(c);homeApplyPage();')
    (user/'home.js').write_text('// HOME_PAGE_INSTALLED\n'+js)
    html=(user/'index.html').read_text()
    html=html.replace('<main class="shell">','<main class="shell">'+PAGE+PULSE,1)
    html,count=re.subn(r'(<section\b[^>]*\bid="home"[^>]*>)',r'\1<a id="heroOpen" class="hero-open" href="#destacado" aria-label="Abrir destacado"></a>',html,count=1)
    if count!=1:raise RuntimeError('Home hero source changed; refusing incomplete overlay')
    html=html.replace('</style>',(ROOT/'android-sync/assets/home-page.css').read_text()+'\n</style>',1)
    (user/'index.html').write_text(html)

    admin=r/'app-admin/src/main/assets'
    html=(admin/'index.html').read_text()
    fields='''<div class="two"><div><label for="hero-eyebrow">Etiqueta del destacado</label><input id="hero-eyebrow" maxlength="60"><label for="hero-image-url">Imagen del hero (URL HTTPS, opcional)</label><input id="hero-image-url" inputmode="url" placeholder="https://..."><label for="hero-secondary-label">Botón secundario</label><input id="hero-secondary-label" maxlength="40"><label for="hero-secondary-target">Destino secundario</label><input id="hero-secondary-target" placeholder="tv, predict o https://..."></div><div><h3>Página del hero</h3><p class="hint">Tocar la imagen o el título abre esta página dentro del app. Sus botones conservan los destinos configurados.</p><label for="hero-page-title">Título de la página</label><input id="hero-page-title" maxlength="120"><label for="hero-page-body">Contenido completo</label><textarea id="hero-page-body" maxlength="6000" rows="8" placeholder="Escribe el contenido del destacado. Separa párrafos con una línea vacía."></textarea></div></div>'''
    begin=html.index('<section class="card module" data-module="hero">');end=html.index('</section>',begin)
    html=html[:end]+fields+html[end:]
    html=html.replace('<option value="predict">HypePredict</option>','<option value="predict">Track Hub / HypePredict</option><option value="featured">Página del hero</option>',1)
    begin=html.index('<section class="preview card">');end=html.index('</section>',begin)
    preview='<details><summary>Vista previa de la página del hero</summary><h3 id="previewPageTitle"></h3><p id="previewPageBody" style="white-space:pre-wrap;line-height:1.7"></p></details>'
    html=html[:end]+preview+html[end:];(admin/'index.html').write_text(html)
    js=(admin/'control.js').read_text()
    binds="""state.home.hero.page=state.home.hero.page||{};
 bindValue('hero-eyebrow',()=>state.home.hero.eyebrow,v=>state.home.hero.eyebrow=v);
 bindValue('hero-image-url',()=>state.home.hero.image,v=>state.home.hero.image=v);
 bindValue('hero-secondary-label',()=>state.home.hero.secondary.label,v=>state.home.hero.secondary.label=v);
 bindValue('hero-secondary-target',()=>state.home.hero.secondary.target,v=>state.home.hero.secondary.target=v);
 bindValue('hero-page-title',()=>state.home.hero.page.title,v=>state.home.hero.page.title=v);
 bindValue('hero-page-body',()=>state.home.hero.page.body,v=>state.home.hero.page.body=v);
 """
    js=js.replace('function renderForms(){','function renderForms(){\n '+binds,1)
    js=js.replace('function renderPreview(){const h=state.home.hero;',"function renderPreview(){const h=state.home.hero;$('hero-image-preview').src=imageSrc(h.image,'/assets/media/hero-racing.jpg');$('previewPageTitle').textContent=h.page?.title||h.title||'PlayersHype';$('previewPageBody').textContent=h.page?.body||h.subtitle||'';",1)
    (admin/'control.js').write_text(js)
    contract=(admin/'config-contract.js').read_text().replace("'latest','home'","'latest','home','featured'")
    needle="for(const k of ['primary','secondary'])"
    contract=contract.replace(needle,"c.home.hero.page=c.home.hero.page||{};c.home.hero.page.title=text(c.home.hero.page.title||'',120,'Título de página');c.home.hero.page.body=text(c.home.hero.page.body||'',6000,'Contenido de página');\n "+needle,1)
    (admin/'config-contract.js').write_text(contract)

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('source',type=Path);apply(p.parse_args().source)
