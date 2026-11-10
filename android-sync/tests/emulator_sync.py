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
def scroll_down():
 for _ in range(7):adb('shell','input','swipe','530','1450','530','320','180')
def capture(name):
 with (out/(name+'.png')).open('wb') as f:subprocess.run(['adb','exec-out','screencap','-p'],stdout=f,check=True,timeout=30)
def launch():adb('shell','am','start','-W','-n',package+'/com.playershype.app.MainActivity')
try:
 launch();wait_text(hero_title);scroll_down();xml=wait_text('GitHub confirmado');assert expected in xml
 (out/'App-online-sync.xml').write_text(xml);capture('App-online-sync');print('PASS actual APK downloaded docs/app/index.html; revision '+expected)
 adb('shell','cmd','connectivity','airplane-mode','enable');adb('shell','svc','wifi','disable');adb('shell','svc','data','disable')
 adb('shell','am','force-stop',package);launch();wait_text(hero_title);scroll_down();xml=wait_text('Sin conexión');assert expected in xml
 (out/'App-offline-sync.xml').write_text(xml);capture('App-offline-sync');print('PASS offline restart keeps the last valid published revision')
 (out/'SYNC_RESULT.txt').write_text('PASS real GitHub app-route download and offline restart; revision '+expected+'\nPublishing transactions separately tested through the actual Admin buttons and native Git publisher mock transport.\n')
finally:
 for command in [('cmd','connectivity','airplane-mode','disable'),('svc','wifi','enable'),('svc','data','enable')]:
  try:adb('shell',*command)
  except Exception:pass
 try:
  (out/'sync-device-logcat.txt').write_text(adb('logcat','-d','-t','3000'));capture('App-sync-final')
 except Exception:pass
