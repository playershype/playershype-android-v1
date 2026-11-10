"""Install approved compact Home B after sync/results/width overlays."""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]


def apply(root):
    assets = root / 'app-user/src/main/assets'
    page = assets / 'index.html'
    html = page.read_text()
    html = html.replace('</style>', (ROOT/'home/compact.css').read_text()+'\n</style>', 1)
    start = html.index('<section class="hero"')
    end = html.index('<div id="module-live"', start)
    html = html[:start]+'''<section class="hero" id="home" aria-busy="true">
      <div class="hero-content"><div class="eyebrow" id="heroEyebrow"></div>
      <h1 id="heroTitle">HypePredict</h1><p id="heroSubtitle">Tu análisis comienza aquí.</p>
      <div class="predict-banner"><img id="heroImage" alt="" decoding="async" fetchpriority="high">
      <strong>Análisis de la jornada</strong><div class="hero-actions"><a class="btn primary" id="heroPrimary" href="/navigate/predict">ABRIR HYPEPREDICT →</a><a id="heroSecondary" hidden></a></div></div></div></section>
      <div class="quick" id="quickNav"><a href="/navigate/predict"><span class="ico" aria-hidden="true">▤</span><b>HypePick 6</b></a><a href="/navigate/results"><span class="ico" aria-hidden="true">▥</span><b>Resultados</b></a></div>
      '''+html[end:]
    html = re.sub(r'<div id="module-hypepredict"[\s\S]*?(?=<div id="module-tv")', '', html, count=1)
    html = html.replace('<h2>Hipódromos de Hoy</h2><p>Carreras, condiciones y acceso al Track Hub.</p>', '<h2>Programa del día</h2><p id="programDate">Análisis publicados para la fecha.</p>')
    html = html.replace('<a class="section-link" href="/navigate/predict">TRACK HUB →</a>', '<label class="date-control">Elegir fecha<input id="homeDate" type="date" aria-label="Fecha del programa"></label>')
    html = html.replace('<p>La señal de La Manada en YouTube.</p>', '<div class="tv-handle"><span class="youtube-mark" aria-hidden="true">▶</span>@playershypetv</div>')
    html = html.replace('ABRIR YOUTUBE →','VER CANAL ↗')
    html = html.replace('<div class="programs" id="tvPrograms"></div>', '<div><h3 class="programs-title">Explora PlayersHype</h3><div class="programs" id="tvPrograms"></div></div>')
    page.write_text(html)
    js = (assets/'home.js').read_text()
    def function(name, body):
        nonlocal js
        pattern = r'function '+name+r'\([\s\S]*?(?=\n(?:async )?function |\nwindow\.)'
        js, n = re.subn(pattern, lambda _: body, js, count=1, flags=re.S)
        if n != 1: raise RuntimeError('Missing Home function '+name)
    function('showModules', (ROOT/'home/functions.js').read_text().split('// HERO')[0])
    functions = (ROOT/'home/functions.js').read_text()
    for name, marker, next_marker in [('renderHero','// HERO','// TRACKS'),('renderTracks','// TRACKS','// TV'),('renderTV','// TV','// END')]:
        function(name, functions.split(marker+'\n')[1].split(next_marker)[0].rstrip())
    function('renderHP', 'function renderHP(c){}')
    # The local native projection remains small and scoped to the selected date.
    js = js.replace("const packaged=loadPackagedConfig();", "const packaged=loadPackagedConfig();\n let selectedDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Puerto_Rico',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());\n const dateInput=$('homeDate');dateInput.value=selectedDate;let generation=0;")
    js = js.replace('async function read(){', 'async function read(date=selectedDate){')
    js = js.replace("fetch('/core/home-config',{cache:'no-store'})", "fetch('/core/home-config'+(date===dateInput.defaultValue?'':'?date='+encodeURIComponent(date)),{cache:'no-store'})")
    js = js.replace('return packaged;\n }', "const fallback=await packaged;return {...fallback,tracks:[],__homeDate:date};\n }")
    js = js.replace("draw(await read());", "dateInput.defaultValue=selectedDate;\n async function update(offline=false){const ticket=++generation,date=selectedDate;const next=await read(date);if(ticket===generation&&date===selectedDate)draw(next,offline)}\n await update();\n dateInput.addEventListener('change',()=>{if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(dateInput.value))return;selectedDate=dateInput.value;$('tracksGrid').innerHTML='<div class=\"card empty\">Cargando programa…</div>';update().catch(()=>toast('No se pudo cargar la fecha.'))});")
    js = js.replace('draw(await read(),offline);','await update(offline);')
    js = js.replace('https://youtube.com/@playershype1','https://www.youtube.com/@playershypetv')
    js=js.replace("function render(c,feed,mode){config=c;", "function render(c,feed,mode){c={...c,channels:{...c.channels,youtube:'https://www.youtube.com/@playershypetv'}};config=c;")
    (assets/'home.js').write_text(js)
    java = root/'shared/src/main/java/com/playershype/shared/SecureActivity.java'
    text = java.read_text().replace('feed.get().homeConfiguration()', 'feed.get().homeConfiguration(u.getQueryParameter("date"))')
    text = text.replace('  private void navigate(String route,@Nullable String track){', '  private void navigate(String route,@Nullable String track){navigate(route,track,null);}\n  private void navigate(String route,@Nullable String track,@Nullable String date){')
    text = text.replace('navigate("predict",u.getQueryParameter("track"));', 'String date=u.getQueryParameter("date");if(date!=null)try{java.time.LocalDate.parse(date);}catch(Exception e){toast("Fecha inválida");return true;}navigate("predict",u.getQueryParameter("track"),date);')
    text = text.replace('track==null?"window.HypePublic', 'track==null&&date==null?"window.HypePublic')
    text = text.replace('JSONObject.quote(track)+")";', '(track==null?"null":JSONObject.quote(track))+","+(date==null?"null":JSONObject.quote(date))+")";')
    text=text.replace('new String[]{"Inicio","Tracks","Predict","Resultados","TV","Latest"}', 'new String[]{"Inicio","Jornada","Predict","Resultados","TV"}').replace('new String[]{"home","tracks","predict","results","tv","latest"}', 'new String[]{"home","tracks","predict","results","tv"}')
    java.write_text(text)
    dashboard = root/'shared/src/main/assets/sync/dashboard.js'
    text = dashboard.read_text().replace("openTrack(id){phInitial.then(()=>{hpGoToJornada();syncDateTracks($('#date').value||SELECTED_DATE,id)})}", "openTrack(id,date){phInitial.then(()=>{hpGoToJornada();if(date)$('#date').value=date;syncDateTracks(date||$('#date').value||SELECTED_DATE,id||$('#track').value)})}")
    dashboard.write_text(text)
    audit=root/'scripts/ui-tests/test.cjs'
    audit.write_text(audit.read_text().replace("home.includes('Hipódromos de Hoy')", "home.includes('Programa del día')"))
    print('Installed approved Home B and date-scoped program navigation')


if __name__ == '__main__':
    import sys
    apply(Path(sys.argv[1]))
