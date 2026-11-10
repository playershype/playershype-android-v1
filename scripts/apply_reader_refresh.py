"""Public presentation overlay. Keeps every published data envelope intact."""
from pathlib import Path
import re,shutil
ROOT=Path(__file__).resolve().parents[1]
FUNCTIONS=['quickPick','roleAndBoard','fullCheckList','hpDayView','hpHorseProfile']
def document(path):
 s=path.read_text()
 if 'PH_READER_REFRESH_START' in s:return
 for name in FUNCTIONS:
  pattern=r'^function '+name+r'\([\s\S]*?(?=^function |^var |^/\* PH_RESULTS_START)'
  s,n=re.subn(pattern,'',s,count=1,flags=re.M)
  if n!=1:raise RuntimeError('Missing '+name+' in '+str(path))
 s=s.replace('/* PH_RESULTS_START */','/* PH_READER_REFRESH_START */\n'+(ROOT/'ui-refresh/reader.js').read_text()+'\n/* PH_READER_REFRESH_END */\n/* PH_RESULTS_START */',1)
 s=s.replace('</style>',(ROOT/'ui-refresh/reader.css').read_text()+'\n</style>',1)
 s=re.sub(r' <details class="more"><summary>Leer el análisis original íntegro[\s\S]*?</details>\n','',s,count=1)
 old='<div class="pace-lanes">${paceLane("Speed",pace.speed)}${paceLane("Presser",pace.presser)}${paceLane("Stalker",pace.stalker)}${paceLane("Closer",pace.closer)}</div>'
 assert old in s;s=s.replace(old,'${hpPaceMap(pace)}')
 s=s.replace('<pre>${esc(wager)}</pre>','${hpWager(a)}')
 s=s.replace('const wager=sourceHypeBet(a);','const wager=a.hypeBet||sourceHypeBet(a);')
 s=s.replace('<section><h4 class="block-title">🏆 HypeBoard · Campo completo</h4>', '${hpFinishProjection(a)}<section><h4 class="block-title">🏆 HypeBoard · Campo completo</h4>')
 # Rows also support keyboard activation. Buttons already receive native keyboard clicks.
 s=s.replace('hpOpenHorse(Number(el.dataset.horseIndex))})});','hpOpenHorse(Number(el.dataset.horseIndex))});if(el.tagName!=="BUTTON")el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();hpOpenHorse(Number(el.dataset.horseIndex))}})});')
 # Recognize record metadata without borrowing unscoped statistics from another source.
 s=s.replace("'Value','LECTURA','USO'", "'Value','Récord Jinete','Récord Entrenador','Récord Establo/propietario','Período Jinete','Período Entrenador','Período Establo/propietario','Contexto Jinete','Contexto Entrenador','Contexto Establo/propietario','LECTURA','USO'")
 path.write_text(s)
def public():
 document(ROOT/'docs/hypepredict/index.html')
 app=ROOT/'docs/app/index.html'
 old=app.read_text()
 envelope=re.search(r'<script id="phPublishedConfig"[^>]*>[\s\S]*?</script>',old)
 if not envelope:raise RuntimeError('Missing published integrity envelope')
 source=(ROOT/'docs/hypepredict/index.html').read_text()
 source=source.replace('const next=await res.json();', """const envelope=JSON.parse(document.getElementById('phPublishedConfig').textContent);const raw=Uint8Array.from(atob(envelope.data),c=>c.charCodeAt(0));const json=await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(json)))).map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==envelope.sha256)throw Error('Integridad inválida');const next=JSON.parse(json);if(next.revision!==envelope.revision)throw Error('Revisión incompatible');""")
 source=source.replace('const res=await fetch(url.href,','const res={ok:true};/* retained envelope */ const unused=()=>fetch(url.href,')
 source=source.replace('<script>',envelope.group(0)+'\n<script>',1)
 app.write_text(source)
def native(root):
 java=root/'shared/src/main/java/com/playershype/shared/SecureActivity.java'
 s=java.read_text();start=s.index('    for(int i=0;i<labels.length;i++)');end=s.index('\n    root.addView(nav)',start)
 old=s[start:end]
 s=s[:start]+'''    if(isAdmin()){
'''+old+'''
    }else{
      nav.setOrientation(LinearLayout.HORIZONTAL);nav.setBackgroundColor(Color.rgb(10,25,47));nav.setPadding(4,2,4,2);
      for(int i=0;i<labels.length;i++){
        final String route=routes[i];android.widget.ImageButton b=new android.widget.ImageButton(this);
        UserNavIcon icon=new UserNavIcon(i);userIcons.put(route,icon);userButtons.put(route,b);b.setImageDrawable(icon);b.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER);
        int pad=Math.round(10*getResources().getDisplayMetrics().density);b.setPadding(pad,pad,pad,pad);b.setContentDescription(labels[i]);b.setTooltipText(labels[i]);
        b.setBackground(new android.graphics.drawable.RippleDrawable(android.content.res.ColorStateList.valueOf(0x3352f4d3),null,new android.graphics.drawable.ColorDrawable(Color.WHITE)));
        b.setOnClickListener(v->{if(android.provider.Settings.Global.getFloat(getContentResolver(),android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,1f)>0){b.animate().cancel();b.setScaleX(.9f);b.setScaleY(.9f);b.animate().scaleX(1).scaleY(1).setDuration(140).start();}navigate(route,null);});
        nav.addView(b,new LinearLayout.LayoutParams(0,Math.round(52*getResources().getDisplayMetrics().density),1));
      }
    }'''+s[end:]
 s=s.replace('  private FrameLayout content;', '  private FrameLayout content;\n  private final Map<String,UserNavIcon> userIcons=new LinkedHashMap<>();\n  private final Map<String,android.widget.ImageButton> userButtons=new LinkedHashMap<>();')
 target='    String page=(route.equals("predict")||route.equals("results"))?"predict":"home";active=route;'
 assert target in s;s=s.replace(target,target+'\n    for(Map.Entry<String,UserNavIcon> item:userIcons.entrySet()){boolean selected=item.getKey().equals(route);item.getValue().select(selected);userButtons.get(item.getKey()).setSelected(selected);}')
 java.write_text(s)
 shutil.copy(ROOT/'ui-refresh/UserNavIcon.java',root/'shared/src/main/java/com/playershype/shared/UserNavIcon.java')
if __name__=='__main__':public()
