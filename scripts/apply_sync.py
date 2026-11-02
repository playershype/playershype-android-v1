"""Install the two-route publishing integration on the retained Android source."""
from pathlib import Path
import argparse,re,json,shutil
P=Path(__file__).resolve().parents[1]
def patch(path,old,new):
 s=path.read_text()
 if old not in s:raise RuntimeError('Expected source missing: '+str(path)+' / '+old[:80])
 path.write_text(s.replace(old,new))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('source',type=Path);args=ap.parse_args();r=args.source.resolve();overlay=P/'android-sync'
 shared=r/'shared/src/main';assets=shared/'assets';(assets/'sync').mkdir(exist_ok=True)
 for p in (overlay/'java').glob('*.java'):shutil.copy(p,shared/'java/com/playershype/shared'/p.name)
 for p in (overlay/'assets').glob('*.js'):shutil.copy(p,assets/'sync'/p.name)
 # Package the published snapshot as a first-install/offline seed; never invent a day.
 shutil.copy(P/'docs/app/config.json',assets/'sync/published-seed.json')
 source=(P/'docs/hypepredict/index.html').read_text();script=re.search(r'<script>([\s\S]*?)</script>',source).group(1)
 native=script.replace("const CONFIG_URL='../app/config.json';","const CONFIG_URL='/core/app-config';")
 native=native.replace('async function load(){',"async function load(event){\n if(event?.type==='click'&&window.HypeAndroid){try{await HypeAndroid.request('sync')}catch(e){$('#status').textContent='Sin conexión · se conserva la última copia válida';return}}")
 native=native.replace('load();\n',"const phInitial=load();\nlet phSyncPending=null;window.PlayersHypeSync={refresh(){if(!phSyncPending)phSyncPending=(async()=>{try{await HypeAndroid.request('sync');await load()}catch(e){$('#status').textContent='Sin conexión · última revisión: '+(DATA?.revision||'copia local')}})().finally(()=>phSyncPending=null);return phSyncPending}};document.addEventListener('visibilitychange',()=>{if(!document.hidden&&window.HypeAndroid)PlayersHypeSync.refresh()});phInitial.then(()=>{if(window.HypeAndroid)PlayersHypeSync.refresh()});\n")
 # Keep the native navigation contract when replacing the legacy public renderer.
 native+="\nwindow.HypePublic=Object.freeze({openHub(){phInitial.then(()=>{hpGoToJornada();render()})},openTrack(id){phInitial.then(()=>{hpGoToJornada();syncDateTracks($('#date').value||SELECTED_DATE,id)})}});\n"
 (assets/'sync/dashboard.js').write_text(native)
 html=re.sub(r'<script>[\s\S]*?</script>','<script src="/assets/native/bridge.js"></script><script src="/assets/sync/dashboard.js"></script>',source,count=1)
 html=html.replace('<head>',"<head><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'\">")
 (assets/'sync/dashboard.html').write_text(html)
 # Exported HTML carries its own immutable, verified public snapshot.
 export_script=script.replace('const next=await res.json();', '''const embedded=document.getElementById('phPublishedConfig');let next;
  if(embedded){const envelope=JSON.parse(embedded.textContent);const raw=Uint8Array.from(atob(envelope.data),c=>c.charCodeAt(0));const json=await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(json)))).map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==envelope.sha256)throw Error('Integridad inválida');next=JSON.parse(json);if(next.revision!==envelope.revision)throw Error('Revisión incompatible');}else next=await res.json();''')
 export_script=export_script.replace('const res=await fetch(url.href,',"const res=document.getElementById('phPublishedConfig')?{ok:true}:await fetch(url.href,")
 exported=source.replace(script,export_script)
 (assets/'sync/dashboard-export.html').write_text(exported)
 # Native webviews expose only cached public config and admin-gated publication.
 java=shared/'java/com/playershype/shared/SecureActivity.java'
 patch(java,'private PublicFeedStore feed;', 'private volatile FutureTask<PublicFeedStore> feed;')
 patch(java,'if(!isAdmin())try{feed=new PublicFeedStore(this);}catch(Exception e){toast("No se pudo validar la copia de HypePredict");}', 'if(!isAdmin()){feed=new FutureTask<>(()->new PublicFeedStore(this));io.execute(feed);}')
 patch(java,'feed.refresh()', 'feed.get().refresh()')
 patch(java,'feed.document()', 'feed.get().document()')
 patch(java,'feed.snapshot()', 'feed.get().snapshot()')
 patch(java,'if("/core/feed".equals(path)&&feed!=null)', 'if("/core/app-config".equals(path)&&feed!=null)return response("application/json",200,PublishedConfig.safeJson(feed.configuration().toString()));\n          if("/core/feed".equals(path)&&feed!=null)')
 patch(java,'feed.configuration()', 'feed.get().configuration()')
 patch(java,'  private void navigate(String route,', '  @Override protected void onResume(){super.onResume();if(web!=null)web.evaluateJavascript("window.PlayersHypeSync&&window.PlayersHypeSync.refresh()",null);}\n  private void navigate(String route,')
 # Home consumes the app-route snapshot, never a mismatched copy from the dashboard route.
 home=r/'app-user/src/main/assets/home.js';s=home.read_text();start=s.index('async function boot(){');end=s.index('\nwindow.PlayersHypeRouter',start)
 s=s[:start]+'''async function boot(){
 const packaged=await loadPackagedConfig();
 async function read(){try{const r=await fetch('/core/app-config',{cache:'no-store'});if(r.ok){const c=await r.json();if(c.schemaVersion===2&&c.revision)return c}}catch{}return packaged}
 function draw(c,offline=false){if(c.raceDays&&c.hypepredict?.analyses){const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Puerto_Rico',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());c=JSON.parse(JSON.stringify(c));c.tracks=(c.tracks||[]).filter(t=>{const raw=c.raceDays[t.id],days=Array.isArray(raw)?raw:(Array.isArray(raw?.days)?raw.days:[raw]),d=days.find(x=>x?.date===today);return !!d&&(d.races||[]).some(r=>c.hypepredict.analyses[r.id]?.status==='published')});}render(c,null,'local');$('footerMode').textContent=(offline?'Sin conexión · copia válida · ':c.__sync?.origin==='github'?'GitHub confirmado · ':'Copia local · ')+(c.revision||'local');}
 draw(await read());let pending=null;
 window.PlayersHypeSync={refresh(){if(!pending)pending=(async()=>{try{if(window.HypeAndroid)await HypeAndroid.request('sync');draw(await read())}catch{draw(await read(),true)}})().finally(()=>pending=null);return pending}};
 $('appStatus').addEventListener('click',()=>PlayersHypeSync.refresh());document.addEventListener('visibilitychange',()=>{if(!document.hidden)PlayersHypeSync.refresh()});if(window.HypeAndroid)PlayersHypeSync.refresh();
}
''' +s[end:];s=s.replace("$('appStatus').addEventListener('click',()=>toast('PlayersHype Ecosystem V1.3.1 RC · Home modular'));",'').replace("?'LIVE':'V1.3'","?'LIVE':'V1.4'");home.write_text(s)
 patch(r/'app-user/src/main/assets/index.html','<script src="/assets/home.js">','<script src="/assets/native/bridge.js"></script><script src="/assets/home.js">')
 # Admin's public config can exceed 6 MB because it retains archived race days.
 contract=r/'app-admin/src/main/assets/config-contract.js';patch(contract,'6*1024*1024','24*1024*1024')
 control=r/'app-admin/src/main/assets/control.js';s=control.read_text()
 old="state=saved?.schemaVersion===2?saved:clone(base)"
 s=s.replace("base=await r.json();try{", "base=await r.json();const published=await PHSync.initial();base={...base,...published};try{")
 s=s.replace(old,"state=saved?.schemaVersion===2?{...clone(base),...saved,hypepredict:{...base.hypepredict,...saved.hypepredict},raceDays:saved.raceDays||base.raceDays,horseData:saved.horseData||base.horseData,raceDayHistory:saved.raceDayHistory||base.raceDayHistory}:clone(base)")
 s=s.replace("if(a&&a.startsWith('live-'))", "if(a==='sync-reload'){if(!dirty||confirm('¿Cargar la publicación actual? Exporta el borrador si necesitas conservarlo.'))PHSync.remote().then(c=>{state=c;localStorage.setItem(KEY,JSON.stringify(c));dirty=false;renderAll();msg('Publicación actual cargada.')}).catch(e=>msg(e.message,true));return}if(a&&a.startsWith('live-'))")
 start=s.index('function publish(){');end=s.index('\ndocument.addEventListener',start)
 s=s[:start]+'''async function publish(){try{const valid=persist();msg('Publicando Dashboard + App…');const w=HypeLive.workspace(),result=await PHSync.publish('both',w.cards,w.tracks,valid);state=JSON.parse(localStorage.getItem(KEY));renderAll();msg('Dashboard + App publicados · revisión '+result.revision+' · commit '+shortCommit(result.commit));await refreshPublisherStatus(false)}catch(e){msg('No se completó la publicación: '+e.message,true)}}
''' +s[end:]
 # Individual routes publish the same local draft; they do not write the other destination.
 s=s.replace("const r=await HypeLive.updateApp();", "const w=HypeLive.workspace();const r=await PHSync.publish('app',w.cards,w.tracks,ConfigContract.validate(state));")
 s=s.replace("const r=await HypeLive.updateLive();", "const w=HypeLive.workspace();const r=await PHSync.publish('dashboard',w.cards,w.tracks,ConfigContract.validate(state));")
 s=s.replace('APP ACTUALIZADA','APP PUBLICADA').replace('LIVE ACTUALIZADO','DASHBOARD PUBLICADO')
 s=s.replace("JSON.parse(localStorage.getItem(KEY)||'null')", "await PHSync.draft()")
 s=s.replace('function persist(){','async function persist(){').replace('localStorage.setItem(KEY,JSON.stringify(valid));','await PHSync.saveDraft(valid);')
 s=s.replace('const valid=persist();', 'const valid=await persist();').replace('state=JSON.parse(localStorage.getItem(KEY));','state=await PHSync.draft();')
 s=s.replace("else if(a==='save'){try{persist()}catch(err){msg(err.message,true)}}", "else if(a==='save'){persist().catch(err=>msg(err.message,true))}")
 s=s.replace("PHSync.remote().then(c=>{state=c;localStorage.setItem(KEY,JSON.stringify(c));", "PHSync.remote().then(async c=>{state=c;await PHSync.saveDraft(c);")
 s=s.replace('state=clone(base);localStorage.removeItem(KEY);', 'state=clone(base);PHSync.saveDraft(state).catch(e=>msg(e.message,true));localStorage.removeItem(KEY);')
 control.write_text(s)
 index=r/'app-admin/src/main/assets/index.html';s=index.read_text().replace('☁ Publicar</button>','☁ Publicar Dashboard + App</button>').replace('ACTUALIZAR LIVE','ACTUALIZAR DASHBOARD').replace('Ruta del Live','Ruta antigua del Live (HTML)').replace('Ningún botón publica ambos destinos.','Publica por separado o usa Publicar Dashboard + App para actualizar ambos destinos en un commit.')
 s=s.replace('El index se genera desde las jornadas guardadas en HypePredict. Publicar crea además un respaldo interno automático.','Dashboard: docs/app/config.json · App: docs/app/index.html. La publicación conjunta conserva la misma revisión y crea un respaldo local.')
 s=s.replace('<section class="publish-bar">','<button class="ghost" data-action="sync-reload">Cargar publicación actual</button><section class="publish-bar">')
 # Control loads after the exporter and legacy bridge, then the synchronization adapter.
 s=s.replace('<script src="control.js">','<script src="/assets/sync/publication.js"></script><script src="/assets/sync/sync.js"></script><script src="control.js">')
 index.write_text(s)
 admin=r/'app-admin/src/main/assets/hypepredict/admin.html';s=admin.read_text();s=s.replace('</body>','<script src="/assets/sync/publication.js"></script><script src="/assets/sync/sync.js"></script></body>');admin.write_text(s)
 # Dedicated sync tests supplement, rather than replace, existing protections.
 for p in (overlay/'tests').glob('*.java'):shutil.copy(p,r/'shared/src/test/java/com/playershype/shared'/p.name)
 for module in ['app-user','app-admin']:
  p=r/module/'build.gradle';s=p.read_text().replace('versionCode 7','versionCode 8').replace("versionName '1.3.3'","versionName '1.4.0'");p.write_text(s)
 audit=r/'scripts/v131_static_audit.py';s=audit.read_text().replace('version code 7','version code 8').replace('versionCode 7','versionCode 8').replace('version 1.3.3','version 1.4.0').replace("versionName '1.3.3'","versionName '1.4.0'")
 # Update the one contract that intentionally expands: a bounded public JSON bundle.
 audit.write_text(s)
 security=r/'scripts/security_audit.py';s=security.read_text().replace("checks['publisher bounded to HTML']='Only public HTML may be published' in publisher and '32 * 1024 * 1024' in publisher", "checks['publisher bounded to public HTML or verified dual-route bundle']='Only public HTML or a validated publication bundle may be published' in publisher and '32 * 1024 * 1024' in publisher and 'AtomicGitPublisher' in publisher")
 security.write_text(s)
 print('Installed dual-route sync v1.4.0')
if __name__=='__main__':main()
