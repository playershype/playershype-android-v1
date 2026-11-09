"""Add the bounded local USER launch overlay; never change the Admin identity."""
from pathlib import Path
import shutil

ROOT=Path(__file__).resolve().parents[1]

def apply(source):
    r=Path(source)
    java=r/'shared/src/main/java/com/playershype/shared/SecureActivity.java'
    s=java.read_text()
    old='root.addView(nav);setContentView(root);'
    if old not in s:raise RuntimeError('Native launch root changed; refusing incomplete splash integration')
    s=s.replace(old,'root.addView(nav);FrameLayout launchStage=new FrameLayout(this);launchStage.addView(root,new FrameLayout.LayoutParams(-1,-1));setContentView(launchStage);\n    if(!isAdmin())LaunchSplash.attach(this,launchStage,root,state!=null);',1)
    java.write_text(s)
    user=r/'app-user/src/main'
    assets=user/'assets/branding';assets.mkdir(exist_ok=True)
    shutil.copy(ROOT/'branding/playershype-wordmark.webp',assets/'playershype-wordmark.webp')
    styles=user/'res/values/styles.xml'
    s=styles.read_text().replace('<style name="AppThemeBase" parent="android:style/Theme.Material.NoActionBar">','<style name="AppThemeBase" parent="android:style/Theme.Material.NoActionBar">\n    <item name="android:windowBackground">#0A192F</item>',1)
    styles.write_text(s)

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('source',type=Path);apply(p.parse_args().source)
