"""Constrain controls and responsive layouts without hiding page overflow or changing data."""
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
START='/* PH_MOBILE_FIT_START */';END='/* PH_MOBILE_FIT_END */'

def html(text):
    css=(ROOT/'branding/mobile-fit.css').read_text().strip()
    if START in text:return re.sub(re.escape(START)+r'[\s\S]*?'+re.escape(END),lambda _:css,text,count=1)
    if '</style>' not in text:raise RuntimeError('Expected inline stylesheet missing')
    return text.replace('</style>',css+'\n</style>',1)

def native(source):
    r=Path(source)
    java=r/'shared/src/main/java/com/playershype/shared/SecureActivity.java'
    text=java.read_text()
    marker='root.addView(nav);'
    if marker not in text:raise RuntimeError('Native navigation source changed')
    compact='''// PH_COMPACT_NAV: keep all six destinations visible on narrow/large-text phones.
    int screenDp=getResources().getConfiguration().screenWidthDp;
    if(!isAdmin()&&screenDp>0&&(screenDp<360||(screenDp<480&&getResources().getConfiguration().fontScale>1.2f))){
      java.util.ArrayList<View> items=new java.util.ArrayList<>();while(nav.getChildCount()>0){View item=nav.getChildAt(0);nav.removeViewAt(0);items.add(item);}
      nav.setOrientation(LinearLayout.VERTICAL);
      for(int rowNo=0;rowNo<2;rowNo++){LinearLayout row=new LinearLayout(this);for(int j=rowNo*3;j<Math.min(rowNo*3+3,items.size());j++){View item=items.get(j);int h=Math.round(56*Math.max(1f,getResources().getConfiguration().fontScale)*getResources().getDisplayMetrics().density);row.addView(item,new LinearLayout.LayoutParams(0,h,1));}nav.addView(row,new LinearLayout.LayoutParams(-1,-2));}
    }
    '''
    if '// PH_COMPACT_NAV' not in text:text=text.replace(marker,compact+marker,1)
    java.write_text(text)
    path=r/'app-user/src/main/assets/index.html';path.write_text(html(path.read_text()))
    css=r/'app-admin/src/main/assets/control.css';text=css.read_text()
    text=re.sub(re.escape(START)+r'[\s\S]*?'+re.escape(END),'',text)
    css.write_text(text+'\n'+(ROOT/'branding/mobile-fit.css').read_text())
    # Legacy reader/editor surfaces keep their modules and external styles intact.
    for role in ['app-user','app-admin']:
        assets=r/role/'src/main/assets/hypepredict'
        (assets/'mobile-fit.css').write_text((ROOT/'branding/mobile-fit.css').read_text())
        for name in ['public-template.html','admin.html']:
            path=assets/name
            if path.exists():
                text=path.read_text()
                if 'href="mobile-fit.css"' not in text:text=text.replace('</head>','<link rel="stylesheet" href="mobile-fit.css"></head>',1)
                path.write_text(text)

if __name__=='__main__':
    for name in ['docs/hypepredict/index.html','docs/app/index.html']:
        p=ROOT/name;p.write_text(html(p.read_text()));print('Mobile fit:',name)
