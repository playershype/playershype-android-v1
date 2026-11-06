"""Verify the explicit Results tab, real public response and persisted offline copy."""
import json,pathlib,re,subprocess,time,xml.etree.ElementTree as ET,urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo
out=pathlib.Path('emulator-evidence');out.mkdir(exist_ok=True)
package='com.playershype.app.preview'
def adb(*args):return subprocess.check_output(['adb',*args],text=True,stderr=subprocess.STDOUT,timeout=90)
def tree():
 adb('shell','uiautomator','dump','/sdcard/playershype-results.xml')
 return adb('shell','cat','/sdcard/playershype-results.xml')
def wait_for(predicate,label):
 deadline=time.monotonic()+120
 while time.monotonic()<deadline:
  try:
   xml=tree();root=ET.fromstring(xml)
   (out/'last-results-screen.xml').write_text(xml)
   if predicate(root):return xml
  except (ET.ParseError,subprocess.CalledProcessError,subprocess.TimeoutExpired):pass
  time.sleep(2)
 raise RuntimeError('Results UI timeout: '+label)
def texts(root):return ' '.join(n.get('text','') for n in root.iter('node'))
def tap_results():
 xml=wait_for(lambda r:any(n.get('text')=='Resultados' and n.get('class')=='android.widget.Button' for n in r.iter('node')),'native Results navigation')
 node=next(n for n in ET.fromstring(xml).iter('node') if n.get('text')=='Resultados' and n.get('class')=='android.widget.Button')
 x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')));adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
def capture(name):
 with (out/(name+'.png')).open('wb') as f:subprocess.run(['adb','exec-out','screencap','-p'],stdout=f,check=True,timeout=30)
def launch():adb('shell','am','start','-W','-n',package+'/com.playershype.app.MainActivity')
try:
 date=datetime.now(ZoneInfo('America/Puerto_Rico')).date().isoformat()
 request=urllib.request.Request('https://hypepredict-results.players-hype1.workers.dev/results?track=CMR&date='+date,headers={'User-Agent':'PlayersHype-Results-QA/1.4.6','Accept':'application/json'})
 with urllib.request.urlopen(request,timeout=30) as response:expected=json.load(response)
 assert expected['date']==date and expected['track']=='Camarero' and expected['ok']
 count=sum(bool(r.get('winner',{}).get('horse') or r.get('winner',{}).get('name')) for r in expected['races'])
 launch();tap_results()
 xml=wait_for(lambda r:f'{count} RESULTADOS PUBLICADOS' in texts(r),'real source results')
 assert date in xml
 (out/'App-results-online.xml').write_text(xml);capture('App-results-online')
 print('PASS actual Results tab displays live Camarero response:',date,count)
 adb('shell','cmd','connectivity','airplane-mode','enable');adb('shell','svc','wifi','disable');adb('shell','svc','data','disable')
 adb('shell','am','force-stop',package);launch();tap_results()
 xml=wait_for(lambda r:'SIN CONEXIÓN' in texts(r) and 'COPIA GUARDADA' in texts(r),'cached results after offline restart')
 assert date in xml
 (out/'App-results-offline.xml').write_text(xml);capture('App-results-offline')
 (out/'RESULTS_RESULT.txt').write_text('PASS explicit native Results tab, actual Camarero gateway response and persisted cache after offline restart. Date '+date+', published winners '+str(count)+'.\n')
 print('PASS offline restart preserves the matching public results cache')
finally:
 for command in [('cmd','connectivity','airplane-mode','disable'),('svc','wifi','enable'),('svc','data','enable')]:
  try:adb('shell',*command)
  except Exception:pass
 try:(out/'results-device-logcat.txt').write_text(adb('logcat','-d','-t','3000'))
 except Exception:pass
