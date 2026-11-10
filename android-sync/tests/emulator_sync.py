"""Verify real app-route download and an offline restart on the Android emulator."""
import json,os,pathlib,re,subprocess,time,xml.etree.ElementTree as ET
out=pathlib.Path('emulator-evidence');out.mkdir(exist_ok=True)
repo=pathlib.Path(os.environ['GITHUB_WORKSPACE']);published=json.loads((repo/'docs/app/config.json').read_text());expected=published['revision'];hero_title='Tu análisis comienza aquí.';package='com.playershype.app.preview'
def adb(*args):return subprocess.check_output(['adb',*args],text=True,stderr=subprocess.STDOUT,timeout=90)
def tree():
 adb('shell','uiautomator','dump','/sdcard/playershype-sync.xml');return adb('shell','cat','/sdcard/playershype-sync.xml')
def wait_text(text,seconds=120):
 deadline=time.monotonic()+seconds
 while time.monotonic()<deadline:
  try:
   xml=tree();texts=' '.join(n.get('text','') for n in ET.fromstring(xml).iter('node'))
   (out/'last-sync-screen.xml').write_text(xml)
   if text in texts:return xml
  except (ET.ParseError,subprocess.CalledProcessError,subprocess.TimeoutExpired):pass
  time.sleep(2)
 raise RuntimeError('No se verificó en Android: '+text)
def scroll_to_text(text,seconds=120):
 # Derive gestures from the actual WebView. Fixed device coordinates can hit
 # the native TV button when the navigation wraps or the viewport changes.
 deadline=time.monotonic()+seconds
 while time.monotonic()<deadline:
  xml=tree();root=ET.fromstring(xml)
  (out/'last-sync-screen.xml').write_text(xml)
  if any(text in n.get('text','') for n in root.iter('node')):return xml
  views=[n for n in root.iter('node') if n.get('class')=='android.webkit.WebView' and n.get('package')==package]
  if not views:raise RuntimeError('Expected app WebView while scrolling to '+text)
  bounds=list(map(int,re.findall(r'\d+',views[0].get('bounds',''))))
  if len(bounds)!=4:raise RuntimeError('Missing WebView bounds')
  left,top,right,bottom=bounds;x=left+max(8,(right-left)//20)
  adb('shell','input','swipe',str(x),str(top+(bottom-top)*4//5),str(x),str(top+(bottom-top)//4),'600')
  time.sleep(1)
 raise RuntimeError('No se verificó en Android: '+text)
def capture(name):
 with (out/(name+'.png')).open('wb') as f:subprocess.run(['adb','exec-out','screencap','-p'],stdout=f,check=True,timeout=30)
def launch():adb('shell','am','start','-W','-n',package+'/com.playershype.app.MainActivity')
try:
 launch();wait_text(hero_title);xml=scroll_to_text('GitHub confirmado');assert expected in xml
 (out/'App-online-sync.xml').write_text(xml);capture('App-online-sync');print('PASS actual APK downloaded docs/app/index.html; revision '+expected)
 adb('shell','cmd','connectivity','airplane-mode','enable');adb('shell','svc','wifi','disable');adb('shell','svc','data','disable')
 adb('shell','am','force-stop',package);launch();wait_text(hero_title);xml=scroll_to_text('Sin conexión');assert expected in xml
 (out/'App-offline-sync.xml').write_text(xml);capture('App-offline-sync');print('PASS offline restart keeps the last valid published revision')
 (out/'SYNC_RESULT.txt').write_text('PASS real GitHub app-route download and offline restart; revision '+expected+'\nPublishing transactions separately tested through the actual Admin buttons and native Git publisher mock transport.\n')
finally:
 for command in [('cmd','connectivity','airplane-mode','disable'),('svc','wifi','enable'),('svc','data','enable')]:
  try:adb('shell',*command)
  except Exception:pass
 try:
  (out/'sync-device-logcat.txt').write_text(adb('logcat','-d','-t','3000'));capture('App-sync-final')
 except Exception:pass
