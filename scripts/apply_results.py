"""Restore public results through the current renderer and native routes."""
from pathlib import Path
import re,argparse
ROOT=Path(__file__).resolve().parents[1]

def replace(path,old,new):
 s=path.read_text()
 if old not in s:raise RuntimeError('Results overlay mismatch: '+old[:90])
 path.write_text(s.replace(old,new,1))

def web(path):
 s=path.read_text();css=(ROOT/'results/reader.css').read_text();js=(ROOT/'results/reader.js').read_text()
 if '/* PH_RESULTS_START */' in s:
  s=re.sub(r'/\* PH_RESULTS_START \*/[\s\S]*?/\* PH_RESULTS_END \*/',lambda _:'/* PH_RESULTS_START */\n'+js+'\n/* PH_RESULTS_END */',s,count=1)
  s=re.sub(r'/\* PH_RESULTS_CSS_START \*/[\s\S]*?/\* PH_RESULTS_CSS_END \*/',lambda _:'/* PH_RESULTS_CSS_START */\n'+css+'\n/* PH_RESULTS_CSS_END */',s,count=1)
 else:
  s=s.replace('</style>','/* PH_RESULTS_CSS_START */\n'+css+'\n/* PH_RESULTS_CSS_END */\n</style>',1)
  s=s.replace('function render(){','/* PH_RESULTS_START */\n'+js+'\n/* PH_RESULTS_END */\nfunction render(){',1)
  s=s.replace('function render(){','''function render(){
 const resultsView=location.hash==='#resultados';
 document.querySelector('.controls').hidden=resultsView;
 if(resultsView){
  document.getElementById('raceNav').innerHTML=hpRaceNav([],0);
  document.getElementById('status').textContent='Resultados · Camarero · consulta independiente del análisis';
  if(document.getElementById('hpResults'))HPResults.resume();else HPResults.mount(SELECTED_DATE||REQUESTED_DATE||hpTodayInPuertoRico());
  return;
 }
''',1)
  s=s.replace("(!n?'active':'')", "(!n&&location.hash!=='#resultados'?'active':'')",1)
  s=s.replace(" items+=races.map(function(r)", " items+='<a class=\"'+(location.hash==='#resultados'?'active':'')+'\" href=\"#resultados\">RESULTADOS</a>';\n items+=races.map(function(r)",1)
  s=s.replace('if(nav)nav.innerHTML="";', 'if(nav)nav.innerHTML=hpRaceNav([],0);',1)
  s=s.replace('<nav id="raceNav"></nav>','<nav id="raceNav"><a href="#resultados">RESULTADOS</a></nav>',1)
  s=s.replace('  $("#status").textContent="No se pudo cargar la información pública";', "  if(location.hash==='#resultados'){render();return}\n  document.getElementById('raceNav').innerHTML=hpRaceNav([],0);\n  $(\"#status\").textContent=\"No se pudo cargar la información pública\";",1)
  s=s.replace(' var id=document.querySelector("#track").value;', ' HPResults.stop();\n var id=document.querySelector("#track").value;',1)
  idx=s.rfind('load();\n');assert idx>=0;s=s[:idx]+"if(location.hash==='#resultados')render();\n"+s[idx:]
 path.write_text(s)

def native(root):
 java=root/'shared/src/main/java/com/playershype/shared/SecureActivity.java'
 replace(java,'new String[]{"Inicio","Tracks","Predict","TV","Latest"}', 'new String[]{"Inicio","Tracks","Predict","Resultados","TV","Latest"}')
 replace(java,'new String[]{"home","tracks","predict","tv","latest"}', 'new String[]{"home","tracks","predict","results","tv","latest"}')
 replace(java,'String page=route.equals("predict")?"predict":"home";active=route;', 'if(web!=null&&!route.equals(active))web.evaluateJavascript("window.HPResults&&window.HPResults.stop()",null);\n    String page=(route.equals("predict")||route.equals("results"))?"predict":"home";active=route;')
 replace(java,'track==null?"window.HypePublic&&window.HypePublic.openHub()"', 'route.equals("results")?"window.HypePublic&&window.HypePublic.openResults()":track==null?"window.HypePublic&&window.HypePublic.openHub()"')
 replace(java,'  private void navigate(String route,','  @Override protected void onPause(){if(web!=null)web.evaluateJavascript("window.HPResults&&window.HPResults.stop()",null);super.onPause();}\n  private void navigate(String route,')
 replace(java,'window.PlayersHypeSync&&window.PlayersHypeSync.refresh()','window.PlayersHypeSync&&window.PlayersHypeSync.refresh();window.HPResults&&window.HPResults.resume()')
 replace(java,'if("/core/feed".equals(path)&&feed!=null)', 'if("/core/results".equals(path)&&!isAdmin()){if(!"GET".equals(r.getMethod()))return response("text/plain",405,"GET only");return response("application/json",200,PublicResults.fetch(u.getQueryParameter("track"),u.getQueryParameter("date")));}\n          if("/core/feed".equals(path)&&feed!=null)')
 replace(java,'if(UrlPolicy.isInternal(url)){if("/navigate/predict"', 'if(UrlPolicy.isInternal(url)){if("/navigate/results".equals(u.getPath())&&!isAdmin()){navigate("results",null);return true;}if("/navigate/predict"')
 home=root/'app-user/src/main/assets/index.html'
 replace(home,'<div id="module-live"', '<a class="btn primary" style="display:flex;margin-top:10px;font-size:13px;min-height:46px" href="/navigate/results">RESULTADOS · CAMARERO →</a><div id="module-live"')
 print('Restored public results and explicit user navigation')

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--web',action='store_true');p.add_argument('source',nargs='?',type=Path);a=p.parse_args()
 if a.web:
  for name in ['docs/hypepredict/index.html','docs/app/index.html']:web(ROOT/name)
 if a.source:native(a.source)
