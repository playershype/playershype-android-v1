from pathlib import Path
import sys
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
'mixed content disabled':'MIXED_CONTENT_NEVER_ALLOW' in main,
'no native JS bridge':'addJavascriptInterface' not in main,
'SSL fail closed':'h.cancel()' in main,
'safe browsing back to safety':'backToSafety(true)' in main,
'CSP present':'Content-Security-Policy' in html,
'HTTPS connect only':'connect-src https:' in html,
}
for k,v in checks.items():print(('PASS' if v else 'FAIL'),'-',k)
if not all(checks.values()):sys.exit(1)
print(f'PASS: {sum(checks.values())} controls')
