package com.playershype.app;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.ContentValues;
import android.provider.MediaStore;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.os.Build;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.webkit.SafeBrowsingResponseCompat;
import androidx.webkit.WebResourceErrorCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;
import androidx.webkit.WebViewFeature;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends ComponentActivity {
  private static final String HOME="https://"+UrlPolicy.INTERNAL_HOST+"/assets/index.html";
  private static final String SPLASH="https://"+UrlPolicy.INTERNAL_HOST+"/assets/expansion/splash.html";
  private static final String START=SPLASH;
  private static final String CONFIG_URL="https://raw.githubusercontent.com/playershype/playershype-android-v1/main/docs/app/config.json";
  private static final String PREFS="playershype_user_remote_config";
  private static final String PREF_CONFIG="config";
  private static final String PREF_REVISION="revision";
  private static final String PREF_LAST_SYNC="last_sync";

  private WebView web;
  private WebViewAssetLoader loader;
  private OnBackPressedCallback backCallback;
  private final ExecutorService io=Executors.newSingleThreadExecutor();
  private volatile String cachedConfig="";
  private volatile String revision="";
  private volatile String syncState="idle";
  private volatile long lastSync=0L;
  private String remoteRuntime="";
  private volatile String weatherJson="";

  @Override protected void onCreate(@Nullable Bundle state){
    super.onCreate(state);
    cachedConfig=getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString(PREF_CONFIG,"");
    revision=getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString(PREF_REVISION,"");
    lastSync=getSharedPreferences(PREFS,Context.MODE_PRIVATE).getLong(PREF_LAST_SYNC,0L);
    syncState=cachedConfig.isEmpty()?"idle":"cached";
    remoteRuntime=asset("remote-config.js")+"\n"+asset("predict-dashboard.js");

    backCallback=new OnBackPressedCallback(false){
      @Override public void handleOnBackPressed(){
        if(web==null)return;
        if(web.canGoBack())web.goBack();
        else if(!HOME.equals(web.getUrl()))web.loadUrl(HOME);
      }
    };
    getOnBackPressedDispatcher().addCallback(this,backCallback);
    getWindow().setStatusBarColor(Color.rgb(7,17,29));
    getWindow().setNavigationBarColor(Color.rgb(7,17,29));
    WebView.setWebContentsDebuggingEnabled(false);
    loader=new WebViewAssetLoader.Builder().setDomain(UrlPolicy.INTERNAL_HOST).addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
    web=new WebView(this);
    web.setBackgroundColor(Color.rgb(7,17,29));
    harden(web);
    setContentView(web);
    if(state==null)web.loadUrl(START);else web.restoreState(state);
    syncRemote();
    syncWeather();
  }

  private void harden(WebView v){
    WebSettings s=v.getSettings();
    s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setSafeBrowsingEnabled(true);
    s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setAllowFileAccessFromFileURLs(false);s.setAllowUniversalAccessFromFileURLs(false);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setJavaScriptCanOpenWindowsAutomatically(false);s.setSupportMultipleWindows(false);s.setGeolocationEnabled(false);s.setMediaPlaybackRequiresUserGesture(true);s.setSaveFormData(false);
    v.removeJavascriptInterface("searchBoxJavaBridge_");v.removeJavascriptInterface("accessibility");v.removeJavascriptInterface("accessibilityTraversal");
    v.addJavascriptInterface(new ConfigBridge(),"PlayersHypeConfig");
    CookieManager cm=CookieManager.getInstance();cm.setAcceptCookie(false);cm.setAcceptThirdPartyCookies(v,false);
    v.setWebViewClient(new SecureClient());
  }

  private final class SecureClient extends WebViewClientCompat {
    @Override public void onPageFinished(@NonNull WebView v,@NonNull String url){
      backCallback.setEnabled(v.canGoBack()||!HOME.equals(url));
      if(isRemoteAwarePage(url)&&!remoteRuntime.isEmpty())v.evaluateJavascript(remoteRuntime,null);
      if(SPLASH.equals(url)){
        v.postDelayed(() -> { if(web!=null && SPLASH.equals(web.getUrl())) web.loadUrl(HOME); }, 1600);
      }
    }
    @Nullable @Override public WebResourceResponse shouldInterceptRequest(@NonNull WebView v,@NonNull WebResourceRequest r){
      Uri u=r.getUrl();if(UrlPolicy.isInternal(u.toString()))return loader.shouldInterceptRequest(u);return super.shouldInterceptRequest(v,r);
    }
    @Override public boolean shouldOverrideUrlLoading(@NonNull WebView v,@NonNull WebResourceRequest r){
      String url=r.getUrl().toString();
      if(UrlPolicy.isInternal(url))return false;
      if(UrlPolicy.isAllowedExternal(url)){open(r.getUrl());return true;}
      Toast.makeText(MainActivity.this,"Enlace bloqueado por seguridad",Toast.LENGTH_SHORT).show();return true;
    }
    @Override public void onReceivedSslError(@NonNull WebView v,@NonNull SslErrorHandler h,@NonNull SslError e){h.cancel();Toast.makeText(MainActivity.this,"Conexión segura rechazada",Toast.LENGTH_SHORT).show();}
    @Override public void onSafeBrowsingHit(@NonNull WebView v,@NonNull WebResourceRequest r,int threat,@NonNull SafeBrowsingResponseCompat cb){
      if(WebViewFeature.isFeatureSupported(WebViewFeature.SAFE_BROWSING_RESPONSE_BACK_TO_SAFETY))cb.backToSafety(true);else{v.stopLoading();finish();}
    }
    @Override public void onReceivedError(@NonNull WebView v,@NonNull WebResourceRequest r,@NonNull WebResourceErrorCompat e){if(r.isForMainFrame()&&!UrlPolicy.isInternal(r.getUrl().toString()))v.stopLoading();}
  }

  private boolean isRemoteAwarePage(String url){
    if(url==null||!url.startsWith("https://"+UrlPolicy.INTERNAL_HOST+"/assets/"))return false;
    return url.contains("/index.html")||url.contains("/tracks.html")||url.contains("/predict.html");
  }

  private String asset(String name){
    try(InputStream in=getAssets().open(name);ByteArrayOutputStream out=new ByteArrayOutputStream()){
      byte[] b=new byte[4096];int n;while((n=in.read(b))>=0)out.write(b,0,n);return out.toString(StandardCharsets.UTF_8.name());
    }catch(Exception e){return "";}
  }

  private final class ConfigBridge {
    @JavascriptInterface public String getConfig(){return cachedConfig==null?"":cachedConfig;}
    @JavascriptInterface public String getRevision(){return revision==null?"":revision;}
    @JavascriptInterface public String getSyncStatus(){return syncState==null?"idle":syncState;}
    @JavascriptInterface public long getLastSync(){return lastSync;}
    @JavascriptInterface public String getWeather(){return weatherJson==null?"":weatherJson;}
    @JavascriptInterface public void refresh(){syncRemote();syncWeather();}
    @JavascriptInterface public boolean exportFile(String filename,String mime,String content){if(Build.VERSION.SDK_INT<Build.VERSION_CODES.Q)return false;try{String safe=(filename==null?"playershype-export.txt":filename).replaceAll("[\\\\/:*?\"<>|]","_");ContentValues v=new ContentValues();v.put(MediaStore.MediaColumns.DISPLAY_NAME,safe);v.put(MediaStore.MediaColumns.MIME_TYPE,mime==null?"text/plain":mime);v.put(MediaStore.MediaColumns.IS_PENDING,1);Uri u=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,v);if(u==null)return false;try(java.io.OutputStream o=getContentResolver().openOutputStream(u)){if(o==null)return false;String payload=content==null?"":content;int marker=payload.indexOf(";base64,");if(payload.startsWith("data:")&&marker>5){String encoded=payload.substring(marker+8);o.write(android.util.Base64.decode(encoded,android.util.Base64.DEFAULT));}else{o.write(payload.getBytes(StandardCharsets.UTF_8));}}v.clear();v.put(MediaStore.MediaColumns.IS_PENDING,0);getContentResolver().update(u,v,null,null);runOnUiThread(()->Toast.makeText(MainActivity.this,"Guardado en Descargas: "+safe,Toast.LENGTH_LONG).show());return true;}catch(Exception e){return false;}}
    @JavascriptInterface public boolean exportPdf(String filename,String imageData){if(Build.VERSION.SDK_INT<Build.VERSION_CODES.Q)return false;PdfDocument pdf=null;try{String safe=(filename==null?"playershype-export.pdf":filename).replaceAll("[\\\\/:*?\"<>|]","_");if(!safe.toLowerCase().endsWith(".pdf"))safe+=".pdf";String payload=imageData==null?"":imageData;int marker=payload.indexOf(";base64,");if(!payload.startsWith("data:image/")||marker<5)return false;byte[] bytes=android.util.Base64.decode(payload.substring(marker+8),android.util.Base64.DEFAULT);Bitmap bmp=BitmapFactory.decodeByteArray(bytes,0,bytes.length);if(bmp==null)return false;pdf=new PdfDocument();PdfDocument.PageInfo info=new PdfDocument.PageInfo.Builder(bmp.getWidth(),bmp.getHeight(),1).create();PdfDocument.Page page=pdf.startPage(info);page.getCanvas().drawBitmap(bmp,0,0,null);pdf.finishPage(page);ContentValues v=new ContentValues();v.put(MediaStore.MediaColumns.DISPLAY_NAME,safe);v.put(MediaStore.MediaColumns.MIME_TYPE,"application/pdf");v.put(MediaStore.MediaColumns.IS_PENDING,1);Uri u=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,v);if(u==null)return false;try(java.io.OutputStream o=getContentResolver().openOutputStream(u)){if(o==null)return false;pdf.writeTo(o);}v.clear();v.put(MediaStore.MediaColumns.IS_PENDING,0);getContentResolver().update(u,v,null,null);runOnUiThread(()->Toast.makeText(MainActivity.this,"PDF guardado en Descargas: "+safe,Toast.LENGTH_LONG).show());return true;}catch(Exception e){return false;}finally{if(pdf!=null)pdf.close();}}

  }

  private void syncRemote(){
    if("syncing".equals(syncState))return;
    syncState="syncing";notifyRuntime("Sincronizando");
    io.execute(()->{
      try{
        String raw=downloadConfig();
        JSONObject c=new JSONObject(raw);
        validateRemote(c);
        String rev=c.getString("revision").trim();
        long now=System.currentTimeMillis();
        getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putString(PREF_CONFIG,raw).putString(PREF_REVISION,rev).putLong(PREF_LAST_SYNC,now).apply();
        cachedConfig=raw;revision=rev;lastSync=now;syncState="ok";
        notifyRuntime("Config remoto actualizado");
      }catch(Exception e){
        syncState=(cachedConfig!=null&&!cachedConfig.isEmpty())?"cached":"offline";
        notifyRuntime(e.getMessage()==null?"No se pudo sincronizar":e.getMessage());
      }
    });
  }

  private void syncWeather(){
    io.execute(()->{
      HttpURLConnection c=null;
      try{
        // Hipódromo Camarero / Canóvanas, PR. Weather is live context, never HypeScore input.
        URL u=new URL("https://api.open-meteo.com/v1/forecast?latitude=18.381&longitude=-65.902&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FPuerto_Rico");
        c=(HttpURLConnection)u.openConnection();c.setConnectTimeout(8000);c.setReadTimeout(10000);c.setUseCaches(false);c.setRequestMethod("GET");c.setRequestProperty("Accept","application/json");c.setRequestProperty("User-Agent","PlayersHype-User-V0.1");
        int code=c.getResponseCode();if(code<200||code>=300)return;
        StringBuilder b=new StringBuilder();try(BufferedReader r=new BufferedReader(new InputStreamReader(c.getInputStream(),StandardCharsets.UTF_8))){String line;while((line=r.readLine())!=null)b.append(line);}
        JSONObject src=new JSONObject(b.toString()),cur=src.optJSONObject("current");if(cur==null)return;
        JSONObject out=new JSONObject();out.put("trackId","camarero");out.put("source","Open-Meteo");out.put("time",cur.optString("time",""));out.put("temperatureF",cur.optDouble("temperature_2m",Double.NaN));out.put("feelsLikeF",cur.optDouble("apparent_temperature",Double.NaN));out.put("humidity",cur.optDouble("relative_humidity_2m",Double.NaN));out.put("precipitationIn",cur.optDouble("precipitation",Double.NaN));out.put("weatherCode",cur.optInt("weather_code",-1));out.put("windMph",cur.optDouble("wind_speed_10m",Double.NaN));out.put("windDirection",cur.optDouble("wind_direction_10m",Double.NaN));
        weatherJson=out.toString();notifyRuntime("Clima actualizado");
      }catch(Exception ignored){}finally{if(c!=null)c.disconnect();}
    });
  }

  private String downloadConfig() throws Exception{
    URL u=new URL(CONFIG_URL+"?ts="+System.currentTimeMillis());
    HttpURLConnection c=(HttpURLConnection)u.openConnection();
    c.setConnectTimeout(10000);c.setReadTimeout(15000);c.setUseCaches(false);c.setRequestMethod("GET");
    c.setRequestProperty("Accept","application/json");c.setRequestProperty("Cache-Control","no-cache, no-store");c.setRequestProperty("Pragma","no-cache");c.setRequestProperty("User-Agent","PlayersHype-User-V0.1");
    int code=c.getResponseCode();
    InputStream stream=code>=200&&code<300?c.getInputStream():c.getErrorStream();
    StringBuilder b=new StringBuilder();
    if(stream!=null)try(BufferedReader r=new BufferedReader(new InputStreamReader(stream,StandardCharsets.UTF_8))){String line;while((line=r.readLine())!=null)b.append(line).append('\n');}
    if(code<200||code>=300)throw new Exception("Remote config HTTP "+code);
    String raw=b.toString().trim();if(raw.isEmpty())throw new Exception("Remote config vacío");return raw;
  }

  private void validateRemote(JSONObject c) throws Exception{
    if(c.optInt("schemaVersion",0)<2)throw new Exception("schemaVersion remoto inválido");
    if(c.optString("revision","").trim().isEmpty())throw new Exception("revision remota ausente");
    JSONArray tracks=c.optJSONArray("tracks");JSONObject days=c.optJSONObject("raceDays"),hp=c.optJSONObject("hypepredict");
    if(tracks==null||tracks.length()==0||days==null||hp==null)throw new Exception("Remote config incompleto");
    JSONObject contract=hp.optJSONObject("scoreContract");JSONArray parts=contract==null?null:contract.optJSONArray("components");
    if(contract==null||Math.abs(contract.optDouble("total",-1)-10d)>1e-9||parts==null||parts.length()!=9)throw new Exception("Contrato HypeScore remoto inválido");
    Set<String> ids=new HashSet<>();
    for(int i=0;i<tracks.length();i++){
      JSONObject t=tracks.getJSONObject(i);String id=t.optString("id","").trim();
      if(id.isEmpty()||!ids.add(id)||!days.has(id))throw new Exception("Track remoto inválido");
      JSONObject d=days.getJSONObject(id);JSONArray races=d.optJSONArray("races");if(races==null)throw new Exception("Race Day remoto inválido: "+id);
      if(t.optInt("races",-1)!=races.length())throw new Exception("Conteo remoto inconsistente: "+id);
      if(!"unpublished".equals(d.optString("status"))&&!d.optString("date","").matches("\\d{4}-\\d{2}-\\d{2}"))throw new Exception("Fecha remota inválida: "+id);
    }
  }

  private void notifyRuntime(String message){
    runOnUiThread(()->{
      if(web==null)return;
      String js="window.onPlayersHypeConfigState&&window.onPlayersHypeConfigState("+JSONObject.quote(syncState)+","+JSONObject.quote(revision==null?"":revision)+","+JSONObject.quote(message==null?"":message)+");";
      web.evaluateJavascript(js,null);
    });
  }

  private void open(@NonNull Uri uri){try{Intent i=new Intent(Intent.ACTION_VIEW,uri);i.addCategory(Intent.CATEGORY_BROWSABLE);startActivity(i);}catch(ActivityNotFoundException e){Toast.makeText(this,"No hay navegador disponible",Toast.LENGTH_SHORT).show();}}
  @Override protected void onSaveInstanceState(@NonNull Bundle out){if(web!=null)web.saveState(out);super.onSaveInstanceState(out);}
  @Override protected void onDestroy(){io.shutdownNow();if(web!=null){web.stopLoading();web.removeJavascriptInterface("PlayersHypeConfig");web.clearHistory();web.removeAllViews();web.destroy();web=null;}super.onDestroy();}
}
