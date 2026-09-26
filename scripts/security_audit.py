from pathlib import Path
import sys
import subprocess
import xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1]
manifest=(R/'app/src/main/AndroidManifest.xml').read_text()
main=(R/'app/src/main/java/com/playershype/app/MainActivity.java').read_text()
html=(R/'app/src/main/assets/index.html').read_text()
net=(R/'app/src/main/res/xml/network_security_config.xml').read_text()
checks={
'only INTERNET permission': manifest.count('<uses-permission')==1 and 'android.permission.INTERNET' in manifest,
'cleartext disabled manifest':'android:usesCleartextTraffic="false"' in manifest,
'backup disabled':'android:allowBackup="false"' in manifest,
'network cleartext disabled':'cleartextTrafficPermitted="false"' in net,
'webview debugging disabled':'setWebContentsDebuggingEnabled(false)' in main,
'file access disabled':'setAllowFileAccess(false)' in main,
'content access disabled':'setAllowContentAccess(false)' in main,
'file URL universal access disabled':'setAllowUniversalAccessFromFileURLs(false)' in main,
'file URL access disabled':'setAllowFileAccessFromFileURLs(false)' in main,
'mixed content disabled':'MIXED_CONTENT_NEVER_ALLOW' in main,
'no native JS bridge':'addJavascriptInterface' not in main,
'SSL fail closed':'h.cancel()' in main,
'safe browsing back to safety':'backToSafety(true)' in main,
'safe browsing explicitly enabled':'setSafeBrowsingEnabled(true)' in main,
'external navigation uses browser':'Intent.ACTION_VIEW' in main and 'Intent.CATEGORY_BROWSABLE' in main and 'UrlPolicy.isAllowedExternal' in main,
'CSP present':'Content-Security-Policy' in html,
'HTTPS connect only':'connect-src https:' in html,
}
domains={'root','file','database','sharedpref','external'}
backup=ET.fromstring((R/'app/src/main/res/xml/backup_rules.xml').read_text())
extraction=ET.fromstring((R/'app/src/main/res/xml/data_extraction_rules.xml').read_text())
for name,node in [('backup exclusions',backup),('cloud extraction exclusions',extraction.find('cloud-backup')),('device transfer exclusions',extraction.find('device-transfer'))]:
    checks[name]=node is not None and domains <= {e.get('domain') for e in node.findall('exclude') if e.get('path')=='.'}
tracked=subprocess.check_output(['git','ls-files'],cwd=R,text=True).splitlines()
checks['no signing keys tracked']=not any(p.lower().endswith(('.keystore','.jks','.p12','.pfx')) for p in tracked)
gradle=(R/'app/build.gradle').read_text()
checks['preview passwords from environment']="storePassword System.getenv('PREVIEW_STORE_PASSWORD')" in gradle and "keyPassword System.getenv('PREVIEW_KEY_PASSWORD')" in gradle
for k,v in checks.items():print(('PASS' if v else 'FAIL'),'-',k)
if not all(checks.values()):sys.exit(1)
print(f'PASS: {sum(checks.values())} controls')
