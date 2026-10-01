package com.playershype.admin.v01;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.webkit.WebViewAssetLoader;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.*;
import java.util.concurrent.*;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

public final class MainActivity extends ComponentActivity {
  static final String HOST="appassets.androidplatform.net", START="https://"+HOST+"/assets/admin.html";
  static final String API="https://api.github.com/repos/playershype/playershype-android-v1", SOURCE="v0.1-stitch-clean", PROD="main", PATH="docs/app/config.json";
  static final String PREFS="playershype_admin_publisher", TOKEN="github_token", ALIAS="playershype-admin-v01-publisher";
  WebView web; WebViewAssetLoader loader; String hotfix="",publisher=""; final ExecutorService io=Executors.newSingleThreadExecutor();

  @Override public void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(Color.rgb(3,19,38));getWindow().setNavigationBarColor(Color.rgb(3,19,38));WebView.setWebContentsDebuggingEnabled(false);hotfix=asset("admin-hotfix.js");publisher=asset("admin-publisher.js");loader=new WebViewAssetLoader.Builder().setDomain(HOST).addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();web=new WebView(this);configure(web);setContentView(web);if(b==null)web.loadUrl(START);else web.restoreState(b);getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){public void handleOnBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else finish();}});}

  @SuppressLint("SetJavaScriptEnabled") void configure(WebView v){WebSettings s=v.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setAllowFileAccessFromFileURLs(false);s.setAllowUniversalAccessFromFileURLs(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setJavaScriptCanOpenWindowsAutomatically(false);s.setSupportMultipleWindows(false);s.setGeolocationEnabled(false);s.setSaveFormData(false);v.removeJavascriptInterface("searchBoxJavaBridge_");v.removeJavascriptInterface("accessibility");v.removeJavascriptInterface("accessibilityTraversal");v.addJavascriptInterface(new Bridge(),"HypeAndroid");v.setWebViewClient(new android.webkit.WebViewClient(){@Override public WebResourceResponse shouldInterceptRequest(WebView w,WebResourceRequest r){Uri u=r.getUrl();return HOST.equalsIgnoreCase(u.getHost())?loader.shouldInterceptRequest(u):super.shouldInterceptRequest(w,r);}@Override public boolean shouldOverrideUrlLoading(WebView w,WebResourceRequest r){return !HOST.equalsIgnoreCase(r.getUrl().getHost());}@Override public void onReceivedSslError(WebView w,SslErrorHandler h,SslError e){h.cancel();Toast.makeText(MainActivity.this,"Conexión segura rechazada",Toast.LENGTH_SHORT).show();}@Override public void onPageFinished(WebView w,String u){super.onPageFinished(w,u);if(u!=null&&u.endsWith("/assets/admin.html")){if(!hotfix.isEmpty())w.evaluateJavascript(hotfix,null);if(!publisher.isEmpty())w.evaluateJavascript(publisher,null);}}});}

  String asset(String n){try(InputStream in=getAssets().open(n);ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[4096];int x;while((x=in.read(b))>=0)out.write(b,0,x);return out.toString(StandardCharsets.UTF_8.name());}catch(Exception e){return "";}}

  final class Bridge {
    @JavascriptInterface public boolean isPublisherConfigured(){try{return secret()!=null&&!secret().trim().isEmpty();}catch(Exception e){return false;}}
    @JavascriptInterface public boolean configurePublisher(String t){if(t==null||t.trim().length()<20||t.trim().length()>512)return false;try{saveSecret(t.trim());return true;}catch(Exception e){return false;}}
    @JavascriptInterface public void clearPublisher(){getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().remove(TOKEN).apply();}
    @JavascriptInterface public void publishConfig(String json){io.execute(()->{try{String token=secret();if(token==null||token.isEmpty())throw new Exception("Conexión GitHub no configurada.");JSONObject candidate=new JSONObject(json);basicValidate(candidate);String tid=target(candidate);JSONObject remote=getConfig(token,PROD);JSONObject merged=merge(remote,candidate,tid);basicValidate(merged);String body=merged.toString(2)+"\n";putConfig(token,SOURCE,body,"config: stage PlayersHype V0.1 · "+tid);putConfig(token,PROD,body,"config: publish PlayersHype V0.1 · "+tid);JSONObject verify=getConfig(token,PROD);if(!merged.getString("revision").equals(verify.optString("revision")))throw new Exception("La revisión publicada no coincide.");callback(true,tid+" · "+verify.getJSONObject("raceDays").getJSONObject(tid).optString("date")+" · config remoto confirmado");}catch(Exception e){callback(false,e.getMessage()==null?"Error de publicación":e.getMessage());}});}
  }

  void callback(boolean ok,String m){runOnUiThread(()->{if(web!=null)web.evaluateJavascript("window.onNativePublishResult&&window.onNativePublishResult("+(ok?"true":"false")+","+JSONObject.quote(m)+");",null);});}

  SecretKey key() throws Exception{KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);if(ks.containsAlias(ALIAS))return((KeyStore.SecretKeyEntry)ks.getEntry(ALIAS,null)).getSecretKey();KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");g.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());return g.generateKey();}
  void saveSecret(String s)throws Exception{Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());byte[] iv=c.getIV(),enc=c.doFinal(s.getBytes(StandardCharsets.UTF_8));JSONObject x=new JSONObject();x.put("iv",Base64.encodeToString(iv,Base64.NO_WRAP));x.put("data",Base64.encodeToString(enc,Base64.NO_WRAP));getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putString(TOKEN,x.toString()).apply();}
  String secret()throws Exception{String raw=getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString(TOKEN,null);if(raw==null)return null;JSONObject x=new JSONObject(raw);byte[] iv=Base64.decode(x.getString("iv"),Base64.NO_WRAP),enc=Base64.decode(x.getString("data"),Base64.NO_WRAP);Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,iv));return new String(c.doFinal(enc),StandardCharsets.UTF_8);}

  HttpURLConnection conn(String url,String method,String token)throws Exception{HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();c.setConnectTimeout(15000);c.setReadTimeout(20000);c.setRequestMethod(method);c.setUseCaches(false);c.setRequestProperty("Accept","application/vnd.github+json");c.setRequestProperty("X-GitHub-Api-Version","2022-11-28");c.setRequestProperty("Authorization","Bearer "+token);c.setRequestProperty("User-Agent","PlayersHype-Admin-V0.1");return c;}
  String body(HttpURLConnection c,int code)throws Exception{InputStream in=code>=200&&code<400?c.getInputStream():c.getErrorStream();if(in==null)return"";StringBuilder b=new StringBuilder();try(BufferedReader r=new BufferedReader(new InputStreamReader(in,StandardCharsets.UTF_8))){String l;while((l=r.readLine())!=null)b.append(l).append('\n');}return b.toString();}
  JSONObject meta(String token,String branch)throws Exception{HttpURLConnection c=conn(API+"/contents/"+PATH+"?ref="+branch,"GET",token);int code=c.getResponseCode();String b=body(c,code);if(code<200||code>=300)throw new Exception("No pude leer "+branch+"/"+PATH+" (HTTP "+code+").");return new JSONObject(b);}
  JSONObject getConfig(String token,String branch)throws Exception{JSONObject m=meta(token,branch);String raw=new String(Base64.decode(m.getString("content").replace("\n",""),Base64.DEFAULT),StandardCharsets.UTF_8);return new JSONObject(raw);}
  void putConfig(String token,String branch,String content,String msg)throws Exception{JSONObject m=meta(token,branch),p=new JSONObject();p.put("message",msg);p.put("branch",branch);p.put("sha",m.getString("sha"));p.put("content",Base64.encodeToString(content.getBytes(StandardCharsets.UTF_8),Base64.NO_WRAP));HttpURLConnection c=conn(API+"/contents/"+PATH,"PUT",token);c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json; charset=utf-8");try(OutputStream o=c.getOutputStream()){o.write(p.toString().getBytes(StandardCharsets.UTF_8));}int code=c.getResponseCode();body(c,code);if(code<200||code>=300)throw new Exception("No pude actualizar "+branch+"/"+PATH+" (HTTP "+code+").");}

  String target(JSONObject c)throws Exception{JSONObject lr=c.getJSONObject("hypepredict").optJSONObject("latestReport");String tid=lr==null?"":lr.optString("trackId","");if(tid.isEmpty()){JSONObject days=c.getJSONObject("raceDays");Iterator<String> k=days.keys();while(k.hasNext()){String x=k.next();JSONObject d=days.getJSONObject(x);if(!"unpublished".equals(d.optString("status"))&&d.optJSONArray("races")!=null&&d.optJSONArray("races").length()>0){if(!tid.isEmpty())throw new Exception("El candidato contiene más de una jornada activa nueva.");tid=x;}}}if(tid.isEmpty())throw new Exception("No pude determinar el hipódromo objetivo.");return tid;}

  JSONObject merge(JSONObject remote,JSONObject cand,String tid)throws Exception{JSONObject out=new JSONObject(remote.toString());out.put("revision",cand.getString("revision"));JSONObject od=out.getJSONObject("raceDays"),cd=cand.getJSONObject("raceDays");JSONObject old=od.optJSONObject(tid);Set<String> oldEntries=new HashSet<>();if(old!=null){JSONArray rr=old.optJSONArray("races");if(rr!=null)for(int i=0;i<rr.length();i++){JSONArray es=rr.getJSONObject(i).optJSONArray("entries");if(es!=null)for(int j=0;j<es.length();j++)oldEntries.add(es.getJSONObject(j).optString("id"));}}od.put(tid,new JSONObject(cd.getJSONObject(tid).toString()));
    JSONArray ot=out.getJSONArray("tracks"),ct=cand.getJSONArray("tracks");JSONObject target=null;for(int i=0;i<ct.length();i++)if(tid.equals(ct.getJSONObject(i).optString("id"))){target=ct.getJSONObject(i);break;}if(target==null)throw new Exception("Track objetivo ausente.");boolean done=false;for(int i=0;i<ot.length();i++)if(tid.equals(ot.getJSONObject(i).optString("id"))){ot.put(i,new JSONObject(target.toString()));done=true;break;}if(!done)ot.put(target);
    JSONObject oh=out.getJSONObject("hypepredict"),ch=cand.getJSONObject("hypepredict"),oa=oh.optJSONObject("analyses");
    if(ch.has("title"))oh.put("title",ch.get("title"));if(ch.has("description"))oh.put("description",ch.get("description"));if(ch.has("image"))oh.put("image",ch.get("image"));if(ch.has("version"))oh.put("version",ch.get("version"));if(ch.has("scoreContract"))oh.put("scoreContract",new JSONObject(ch.getJSONObject("scoreContract").toString()));
    if(oa==null)oa=new JSONObject();List<String> rm=new ArrayList<>();Iterator<String> k=oa.keys();while(k.hasNext()){String x=k.next();JSONObject a=oa.optJSONObject(x);if((a!=null&&tid.equals(a.optString("trackId")))||tid.equals(x))rm.add(x);}for(String x:rm)oa.remove(x);JSONObject ca=ch.getJSONObject("analyses");k=ca.keys();while(k.hasNext()){String x=k.next();oa.put(x,new JSONObject(ca.getJSONObject(x).toString()));}oh.put("analyses",oa);if(ch.has("latestReport"))oh.put("latestReport",new JSONObject(ch.getJSONObject("latestReport").toString()));
    JSONObject horse=out.optJSONObject("horseData");if(horse==null)horse=new JSONObject();rm.clear();k=horse.keys();while(k.hasNext()){String x=k.next();JSONObject h=horse.optJSONObject(x),p=h==null?null:h.optJSONObject("profile");if(oldEntries.contains(x)||(p!=null&&tid.equals(p.optString("trackId"))))rm.add(x);}for(String x:rm)horse.remove(x);JSONObject nh=cand.optJSONObject("horseData");if(nh!=null){k=nh.keys();while(k.hasNext()){String x=k.next();horse.put(x,new JSONObject(nh.getJSONObject(x).toString()));}}out.put("horseData",horse);return out;}

  void basicValidate(JSONObject c)throws Exception{if(c.optInt("schemaVersion",0)<2||c.optString("revision","").isEmpty())throw new Exception("Contrato canónico inválido.");JSONArray tracks=c.optJSONArray("tracks");JSONObject days=c.optJSONObject("raceDays"),hp=c.optJSONObject("hypepredict");if(tracks==null||days==null||hp==null||c.optJSONObject("tv")==null)throw new Exception("Config incompleto.");Set<String> tids=new HashSet<>();for(int i=0;i<tracks.length();i++){JSONObject t=tracks.getJSONObject(i);String id=t.optString("id","");if(id.isEmpty()||!tids.add(id)||!days.has(id))throw new Exception("Track/Race Day inválido.");JSONObject d=days.getJSONObject(id);JSONArray races=d.optJSONArray("races");if(races==null||t.optInt("races",-1)!=races.length())throw new Exception("Conteo de carreras inconsistente: "+id);if(!"unpublished".equals(d.optString("status"))&&!d.optString("date","").matches("\\d{4}-\\d{2}-\\d{2}"))throw new Exception("Fecha inválida: "+id);}
    JSONObject sc=hp.optJSONObject("scoreContract");JSONArray parts=sc==null?null:sc.optJSONArray("components");if(sc==null||Math.abs(sc.optDouble("total",-1)-10)>1e-9||parts==null||parts.length()!=9)throw new Exception("Contrato HypeScore inválido.");Map<String,Double> expected=new HashMap<>();expected.put("hypePerformance",2d);expected.put("raceStrength",1.2);expected.put("formTrend",1d);expected.put("distanceSurfaceFit",1.6);expected.put("readinessFitness",.75);expected.put("weight",.45);expected.put("earlyPaceAbility",1d);expected.put("raceShapePaceMatchup",1d);expected.put("projectedTripPost",1d);Set<String> seen=new HashSet<>();for(int i=0;i<parts.length();i++){JSONObject p=parts.getJSONObject(i);String id=p.optString("id","");Double max=expected.get(id);if(max==null||!seen.add(id)||Math.abs(p.optDouble("weight",-9)-max)>1e-9)throw new Exception("Factor HypeScore inválido: "+id);}if(seen.size()!=9)throw new Exception("Factores HypeScore incompletos.");}

  @Override protected void onSaveInstanceState(@NonNull Bundle b){if(web!=null)web.saveState(b);super.onSaveInstanceState(b);}
  @Override protected void onDestroy(){io.shutdownNow();if(web!=null){web.stopLoading();web.removeJavascriptInterface("HypeAndroid");web.clearHistory();web.removeAllViews();web.destroy();web=null;}super.onDestroy();}
}
