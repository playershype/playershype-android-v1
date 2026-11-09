"""Apply one shared width contract to public, packaged and future-exported pages."""
from pathlib import Path
import re,shutil
ROOT=Path(__file__).resolve().parents[1]
START='/* PH_MOBILE_FIT_START */'
END='/* PH_MOBILE_FIT_END */'
def apply(path):
 s=path.read_text();block=START+'\n'+(ROOT/'mobile/fit.css').read_text()+END
 if START in s:s=re.sub(re.escape(START)+r'[\s\S]*?'+re.escape(END),lambda _:block,s,count=1)
 else:
  if '</style>' in s:s=s.replace('</style>',block+'\n</style>',1)
  elif '</head>' in s:s=s.replace('</head>','<link rel="stylesheet" href="/assets/mobile-fit.css">\n</head>',1)
  else:raise RuntimeError('Missing document head: '+str(path))
 path.write_text(s)
def public():
 for name in ['docs/hypepredict/index.html','docs/app/index.html']:apply(ROOT/name)
def native(root):
 # Includes every user screen and both Admin entry points, without changing JS/data.
 for name in ['app-user/src/main/assets/index.html','app-admin/src/main/assets/index.html','app-admin/src/main/assets/hypepredict/admin.html']:
  apply(root/name)
 shutil.copy(ROOT/'mobile/fit.css',root/'shared/src/main/assets/mobile-fit.css')
 java=root/'shared/src/main/java/com/playershype/shared/SecureActivity.java'
 s=java.read_text()
 old='LinearLayout nav=new LinearLayout(this);'
 new='LinearLayout nav=new LinearLayout(this);nav.setOrientation(LinearLayout.VERTICAL);\n    int navColumns=isAdmin()?2:(getResources().getConfiguration().screenWidthDp<420||getResources().getConfiguration().fontScale>1.15f?3:6);\n    LinearLayout[] navRow=new LinearLayout[1];'
 assert old in s;s=s.replace(old,new,1)
 old='for(int i=0;i<labels.length;i++){final String route=routes[i];'
 new='for(int i=0;i<labels.length;i++){if(i%navColumns==0){navRow[0]=new LinearLayout(this);nav.addView(navRow[0],new LinearLayout.LayoutParams(-1,-2));}final String route=routes[i];'
 assert old in s;s=s.replace(old,new,1)
 old='nav.addView(b,new LinearLayout.LayoutParams(0,Math.round(56*getResources().getDisplayMetrics().density),1));'
 new='b.setMaxLines(2);b.setMinHeight(Math.round(56*getResources().getDisplayMetrics().density));navRow[0].addView(b,new LinearLayout.LayoutParams(0,-2,1));'
 assert old in s;s=s.replace(old,new,1)
 old='return response("text/html",200,feed.get().document());'
 new='return response("text/html",200,mobileDocument(feed.get().document()));'
 assert old in s;s=s.replace(old,new,1)
 helper='''
  private String mobileDocument(String html) throws java.io.IOException {
    try(InputStream in=getAssets().open("mobile-fit.css")){
      String css=PublicFeedStore.read(in,65536);
      return html.replace("</head>","<style id=ph-native-mobile-fit>"+css+"</style></head>");
    }
  }
'''
 s=s.replace('  private void harden(WebView v){',helper+'  private void harden(WebView v){',1)
 java.write_text(s)
if __name__=='__main__':public()
