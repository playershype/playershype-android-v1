package com.playershype.shared;

import android.app.AlertDialog;
import android.content.*;
import android.net.Uri;
import android.os.Bundle;
import android.graphics.Color;
import android.webkit.*;
import android.net.http.SslError;
import android.view.View;
import android.widget.*;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.annotation.*;
import androidx.core.view.*;
import androidx.core.graphics.Insets;
import androidx.webkit.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;

/** Shared hardened shell. Only packaged documents may receive native messages. */
public class SecureActivity extends ComponentActivity {
  static final String ORIGIN="https://"+UrlPolicy.INTERNAL_HOST;
  private final Map<String,WebView> pages=new LinkedHashMap<>();
  private final ExecutorService io=Executors.newSingleThreadExecutor();
  private WebView web;
  private FrameLayout content;
  private WebViewAssetLoader loader;
  private PublicFeedStore feed;
  private String active="home";
  private ExportController exports;
  protected boolean isAdmin(){return false;}
  @Override protected void onCreate(@Nullable Bundle state){
    super.onCreate(state);
    WebView.setWebContentsDebuggingEnabled(false);
    loader=new WebViewAssetLoader.Builder().setDomain(UrlPolicy.INTERNAL_HOST).setHttpAllowed(false).addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
    exports=new ExportController(this,io);
    if(!isAdmin())try{feed=new PublicFeedStore(this);}catch(Exception e){toast("No se pudo validar la copia de HypePredict");}
    LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(7,17,29));
    ViewCompat.setOnApplyWindowInsetsListener(root,(v,insets)->{Insets bars=insets.getInsets(WindowInsetsCompat.Type.systemBars()|WindowInsetsCompat.Type.ime());v.setPadding(bars.left,bars.top,bars.right,bars.bottom);return insets;});
    content=new FrameLayout(this);root.addView(content,new LinearLayout.LayoutParams(-1,0,1));
    LinearLayout nav=new LinearLayout(this);
    String[] labels=isAdmin()?new String[]{"Control","HypePredict"}:new String[]{"Inicio","Tracks","Predict","TV","Latest"};
    String[] routes=isAdmin()?new String[]{"home","predict"}:new String[]{"home","tracks","predict","tv","latest"};
    for(int i=0;i<labels.length;i++){final String route=routes[i];Button b=new Button(this);b.setText(labels[i]);b.setTextSize(11);b.setTextColor(Color.WHITE);b.setAllCaps(false);b.setBackgroundColor(Color.rgb(13,33,51));b.setPadding(0,8,0,8);b.setContentDescription(labels[i]);b.setOnClickListener(v->navigate(route,null));nav.addView(b,new LinearLayout.LayoutParams(0,Math.round(56*getResources().getDisplayMetrics().density),1));}
    root.addView(nav);setContentView(root);
    getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){@Override public void handleOnBackPressed(){web.evaluateJavascript("(()=>{if(window.__hpAndroidBack&&window.__hpAndroidBack())return true;if(window.PlayersHypeRouter&&window.PlayersHypeRouter.back())return true;return false})()",result->{if(!"true".equals(result)){if(!active.equals("home"))navigate("home",null);else finish();}});}});
    navigate(state==null?"home":state.getString("active","home"),null);
  }
  private void navigate(String route,@Nullable String track){
    String page=route.equals("predict")?"predict":"home";active=route;
    if(!pages.containsKey(page)){
      WebView v=new WebView(this);v.setBackgroundColor(Color.rgb(7,17,29));harden(v);pages.put(page,v);content.addView(v,new FrameLayout.LayoutParams(-1,-1));
      v.loadUrl(ORIGIN+(page.equals("predict")?(isAdmin()?"/assets/hypepredict/admin.html":"/assets/hypepredict/public.html"):"/assets/index.html"));
    }
    for(Map.Entry<String,WebView> entry:pages.entrySet())entry.getValue().setVisibility(entry.getKey().equals(page)?View.VISIBLE:View.GONE);
    web=pages.get(page);
    String js=page.equals("home")?"window.PlayersHypeRouter&&window.PlayersHypeRouter.open("+JSONObject.quote(route)+")":track==null?null:"window.HypePublic&&window.HypePublic.openTrack("+JSONObject.quote(track)+")";
    if(js!=null){web.setTag(js);web.evaluateJavascript(js,null);}
  }
  private void harden(WebView v){
    WebSettings s=v.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setSafeBrowsingEnabled(true);
    s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setAllowFileAccessFromFileURLs(false);s.setAllowUniversalAccessFromFileURLs(false);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setJavaScriptCanOpenWindowsAutomatically(false);s.setSupportMultipleWindows(false);s.setGeolocationEnabled(false);s.setMediaPlaybackRequiresUserGesture(true);
    v.removeJavascriptInterface("searchBoxJavaBridge_");v.removeJavascriptInterface("accessibility");v.removeJavascriptInterface("accessibilityTraversal");
    CookieManager cm=CookieManager.getInstance();cm.setAcceptCookie(false);cm.setAcceptThirdPartyCookies(v,false);
    if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))WebViewCompat.addWebMessageListener(v,"HypeNative",Collections.singleton(ORIGIN),(view,message,source,main,reply)->{
      if(!main||!ORIGIN.equals(source.toString())||!UrlPolicy.isInternal(view.getUrl()))return;
      String data=message.getData();if(data==null||data.length()>300000)return;
      try{JSONObject m=new JSONObject(data);String id=m.getString("id"),action=m.getString("action");if(id.length()>64)throw new IllegalArgumentException();
        if(action.equals("sync")&&!isAdmin()&&feed!=null){io.execute(()->{try{JSONObject fresh=feed.refresh();runOnUiThread(()->respond(reply,id,true,fresh.toString()));}catch(Exception e){runOnUiThread(()->respond(reply,id,false,"No se pudo actualizar. Se conserva la copia anterior."));}});}
        else if(action.equals("external")){Uri uri=Uri.parse(m.getString("url"));if(!UrlPolicy.isAllowedExternal(uri.toString()))throw new IllegalArgumentException();open(uri);respond(reply,id,true,"");}
        else exports.dispatch(m,reply,isAdmin());
      }catch(Exception e){toast("Operación bloqueada por seguridad");}
    });
    v.setWebViewClient(new SecureClient());
    v.setWebChromeClient(new WebChromeClient(){
      @Override public boolean onJsPrompt(WebView w,String url,String message,String defaultValue,JsPromptResult result){EditText input=new EditText(SecureActivity.this);input.setText(defaultValue);new AlertDialog.Builder(SecureActivity.this).setMessage(message).setView(input).setPositiveButton("Continuar",(d,n)->result.confirm(input.getText().toString())).setNegativeButton("Cancelar",(d,n)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;}
      @Override public boolean onJsAlert(WebView w,String url,String message,JsResult result){new AlertDialog.Builder(SecureActivity.this).setMessage(message).setPositiveButton("OK",(d,n)->result.confirm()).setOnCancelListener(d->result.cancel()).show();return true;}
      @Override public boolean onJsConfirm(WebView w,String url,String message,JsResult result){new AlertDialog.Builder(SecureActivity.this).setMessage(message).setPositiveButton("Continuar",(d,n)->result.confirm()).setNegativeButton("Cancelar",(d,n)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;}
    });
  }
  private final class SecureClient extends WebViewClientCompat {
    @Override public void onPageFinished(@NonNull WebView v,@NonNull String url){if(v.getTag() instanceof String){v.evaluateJavascript((String)v.getTag(),null);v.setTag(null);}}
    @Override public WebResourceResponse shouldInterceptRequest(@NonNull WebView v,@NonNull WebResourceRequest r){
      Uri u=r.getUrl();String path=u.getPath();
      if(!"https".equals(u.getScheme()))return response("text/plain",403,"Blocked");
      if(UrlPolicy.isInternal(u.toString())){
        try{
          if("/assets/hypepredict/public.html".equals(path)&&feed!=null)return response("text/html",200,feed.document());
          if("/core/feed".equals(path)&&feed!=null)return response("application/json",200,feed.snapshot().toString());
          if(path!=null&&(path.endsWith("public-template.html")||path.endsWith("public-seed.json")))return response("text/plain",403,"Blocked");
          WebResourceResponse found=loader.shouldInterceptRequest(u);return found==null?response("text/plain",404,"Not found"):found;
        }catch(Exception e){return response("text/plain",503,"Contenido no disponible");}
      }
      return super.shouldInterceptRequest(v,r);
    }
    @Override public boolean shouldOverrideUrlLoading(@NonNull WebView v,@NonNull WebResourceRequest r){
      Uri u=r.getUrl();String url=u.toString();
      if(UrlPolicy.isInternal(url)){if("/navigate/predict".equals(u.getPath())){navigate("predict",u.getQueryParameter("track"));return true;}return false;}
      if(UrlPolicy.isAllowedExternal(url)){
        if("playershype.net".equalsIgnoreCase(u.getHost())&&u.getPath()!=null&&u.getPath().startsWith("/hypepredict-track-hub")){navigate("predict",null);return true;}
        open(u);return true;
      }toast("Enlace bloqueado por seguridad");return true;
    }
    @Override public void onReceivedSslError(@NonNull WebView v,@NonNull SslErrorHandler h,@NonNull SslError e){h.cancel();toast("Conexión segura rechazada");}
    @Override public void onSafeBrowsingHit(@NonNull WebView v,@NonNull WebResourceRequest r,int threat,@NonNull SafeBrowsingResponseCompat cb){if(WebViewFeature.isFeatureSupported(WebViewFeature.SAFE_BROWSING_RESPONSE_BACK_TO_SAFETY))cb.backToSafety(true);else{v.stopLoading();finish();}}
  }
  private static WebResourceResponse response(String mime,int status,String body){Map<String,String> h=new HashMap<>();h.put("Cache-Control","no-store");h.put("X-Content-Type-Options","nosniff");return new WebResourceResponse(mime,"UTF-8",status,status==200?"OK":"Blocked",h,new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));}
  void open(Uri uri){if(!UrlPolicy.isAllowedExternal(uri.toString()))return;if("playershype.net".equalsIgnoreCase(uri.getHost())&&uri.getPath()!=null&&uri.getPath().startsWith("/hypepredict-track-hub")){navigate("predict",null);return;}try{Intent i=new Intent(Intent.ACTION_VIEW,uri);i.addCategory(Intent.CATEGORY_BROWSABLE);startActivity(i);}catch(ActivityNotFoundException e){toast("No hay navegador disponible");}}
  static void respond(JavaScriptReplyProxy reply,String id,boolean ok,String value){try{reply.postMessage(new JSONObject().put("id",id).put("ok",ok).put(ok?"value":"error",value).toString());}catch(Exception ignored){}}
  void toast(String message){Toast.makeText(this,message,Toast.LENGTH_LONG).show();}
  @Override protected void onActivityResult(int request,int result,@Nullable Intent data){super.onActivityResult(request,result,data);exports.onResult(request,result,data);}
  @Override protected void onSaveInstanceState(@NonNull Bundle out){out.putString("active",active);super.onSaveInstanceState(out);}
  @Override protected void onDestroy(){if(exports!=null)exports.close();io.shutdownNow();for(WebView v:pages.values()){v.stopLoading();v.removeAllViews();v.destroy();}pages.clear();super.onDestroy();}
}
