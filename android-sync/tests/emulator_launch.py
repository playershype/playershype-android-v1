"""Install actual signed APKs and exercise native navigation on the CI Android emulator."""
import pathlib,re,subprocess,time,xml.etree.ElementTree as ET
out=pathlib.Path('emulator-evidence');out.mkdir(exist_ok=True)
# Keep crash diagnostics even if first launch or a later UI assertion fails.
import atexit
@atexit.register
def diagnostics():
    try:
        (out/'device-logcat.txt').write_bytes(subprocess.check_output(['adb','logcat','-d','-t','3000'],stderr=subprocess.STDOUT,timeout=30))
    except Exception: pass
def adb(*args):return subprocess.check_output(['adb',*args],text=True,stderr=subprocess.STDOUT,timeout=90)
def tree():
    adb('shell','uiautomator','dump','/sdcard/playershype-view.xml')
    return adb('shell','cat','/sdcard/playershype-view.xml')
def wait_for(predicate,label):
    deadline=time.monotonic()+60
    while time.monotonic()<deadline:
        try:
            xml=tree()
            if predicate(ET.fromstring(xml)):return xml
        except (ET.ParseError,subprocess.CalledProcessError):pass
        time.sleep(2)
    raise RuntimeError('UI timeout: '+label)
for role,package,button in [('App','com.playershype.app.preview','Predict'),('Admin','com.playershype.admin.preview','HypePredict')]:
    apk=pathlib.Path('artifacts')/f'PlayersHype-{role}-V1.3.1-RC-PREVIEW.apk'
    assert 'Success' in adb('install','-r',str(apk))
    # Capture the actual startup sequence before launching, including the overlay
    # that must cover native menus. Keep this as device evidence, not a DOM mock.
    recording=None
    if role=='App':
        adb('shell','settings','put','global','animator_duration_scale','1.0')
        recording=subprocess.Popen(['adb','shell','screenrecord','--time-limit','7','/sdcard/playershype-startup.mp4'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        time.sleep(.4)
    result=adb('shell','am','start','-W','-n',package+'/'+package.removesuffix('.preview')+'.MainActivity')
    if role=='App':
        with (out/'App-startup.png').open('wb') as f:subprocess.run(['adb','exec-out','screencap','-p'],stdout=f,check=True,timeout=30)

    # A cold emulator can time out am's launch wait; the real UI check below remains mandatory.
    assert 'Status: ok' in result or 'Status: timeout' in result,result
    xml=wait_for(lambda root:any(n.get('text')==button and n.get('class')=='android.widget.Button' for n in root.iter('node')),role+' native navigation')
    if recording is not None:
        recording.wait(timeout=15)
        adb('pull','/sdcard/playershype-startup.mp4',str(out/'App-startup.mp4'))
    root=ET.fromstring(xml);node=next(n for n in root.iter('node') if n.get('text')==button and n.get('class')=='android.widget.Button')
    x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')))
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
    def hub(root):
        texts=' '.join(n.get('text','') for n in root.iter('node')).lower()
        return 'track hub' in texts or 'racetracks' in texts or 'hipódromos' in texts
    xml=wait_for(hub,role+' original HypePredict')
    (out/f'{role}-predict.xml').write_text(xml)
    with (out/f'{role}-predict.png').open('wb') as f:subprocess.run(['adb','exec-out','screencap','-p'],stdout=f,check=True,timeout=30)
    pid=adb('shell','pidof',package).strip();assert pid
    logs=adb('logcat','-d','--pid='+pid)
    (out/f'{role}-logcat.txt').write_text(logs)
    assert 'FATAL EXCEPTION' not in logs
    assert package in adb('shell','dumpsys','activity','activities')
    print('PASS signed APK installs and opens internal HypePredict:',role)
    adb('shell','am','force-stop',package)
(out/'RESULT.txt').write_text('PASS: both signed APKs installed, launched and opened original HypePredict in Android API 36 emulator. Full device parity/authenticated Core remain separate gates.\n')
