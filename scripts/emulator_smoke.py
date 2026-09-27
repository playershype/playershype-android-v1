"""Install actual signed APKs and exercise native navigation on the CI Android emulator."""
import pathlib,re,subprocess,time,xml.etree.ElementTree as ET
out=pathlib.Path('emulator-evidence');out.mkdir(exist_ok=True)
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
    apk=pathlib.Path('artifacts')/f'PlayersHype-{role}-V1-PREVIEW.apk'
    assert 'Success' in adb('install','-r',str(apk))
    result=adb('shell','am','start','-W','-n',package+'/'+package.removesuffix('.preview')+'.MainActivity')
    assert 'Status: ok' in result,result
    xml=wait_for(lambda root:any(n.get('text')==button and n.get('class')=='android.widget.Button' for n in root.iter('node')),role+' native navigation')
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
