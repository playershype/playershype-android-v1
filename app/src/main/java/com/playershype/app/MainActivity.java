package com.playershype.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.webkit.SafeBrowsingResponseCompat;
import androidx.webkit.WebResourceErrorCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

public final class MainActivity extends Activity {
  private static final String START="https://"+UrlPolicy.INTERNAL_HOST+"/assets/index.html";
  private WebView web;
  private WebViewAssetLoader loader;
  @Override protected void onCreate(@Nullable Bundle state){
    super.onCreate(state);
    getWindow().setStatusBarColor(Color.rgb(7,17,29));getWindow().setNavigationBarColor(Color.rgb(7,17,29));
    WebView.setWebContentsDebuggingEnabled(false);
    loader=new WebViewAssetLoader.Builder().setDomain(UrlPolicy.INTERNAL_HOST).addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
    web=new WebView(this);web.setBackgroundColor(Color.rgb(7,17,29));harden(web);setContentView(web);
    if(state==null)web.loadUrl(START);else web.restoreState(state);
  }
  private void harden(WebView v){
    WebSettings s=v.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);
    s.setSafeBrowsingEnabled(true);
    s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setAllowFileAccessFromFileURLs(false);s.setAllowUniversalAccessFromFileURLs(false);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setJavaScriptCanOpenWindowsAutomatically(false);s.setSupportMultipleWindows(false);s.setGeolocationEnabled(false);s.setMediaPlaybackRequiresUserGesture(true);s.setSaveFormData(false);
    v.removeJavascriptInterface("searchBoxJavaBridge_");v.removeJavascriptInterface("accessibility");v.removeJavascriptInterface("accessibilityTraversal");
    CookieManager cm=CookieManager.getInstance();cm.setAcceptCookie(false);cm.setAcceptThirdPartyCookies(v,false);
    v.setWebViewClient(new SecureClient());
  }
  private final class SecureClient extends WebViewClientCompat {
    @Nullable @Override public WebResourceResponse shouldInterceptRequest(@NonNull WebView v,@NonNull WebResourceRequest r){Uri u=r.getUrl();if(UrlPolicy.isInternal(u.toString()))return loader.shouldInterceptRequest(u);return super.shouldInterceptRequest(v,r);}
    @Override public boolean shouldOverrideUrlLoading(@NonNull WebView v,@NonNull WebResourceRequest r){String url=r.getUrl().toString();if(UrlPolicy.isInternal(url))return false;if(UrlPolicy.isAllowedExternal(url)){open(r.getUrl());return true;}Toast.makeText(MainActivity.this,"Enlace bloqueado por seguridad",Toast.LENGTH_SHORT).show();return true;}
    @Override public void onReceivedSslError(@NonNull WebView v,@NonNull SslErrorHandler h,@NonNull SslError e){h.cancel();Toast.makeText(MainActivity.this,"Conexión segura rechazada",Toast.LENGTH_SHORT).show();}
    @Override public void onSafeBrowsingHit(@NonNull WebView v,@NonNull WebResourceRequest r,int threat,@NonNull SafeBrowsingResponseCompat cb){cb.backToSafety(true);}
    @Override public void onReceivedError(@NonNull WebView v,@NonNull WebResourceRequest r,@NonNull WebResourceErrorCompat e){if(r.isForMainFrame()&&!UrlPolicy.isInternal(r.getUrl().toString()))v.stopLoading();}
  }
  private void open(@NonNull Uri uri){try{Intent i=new Intent(Intent.ACTION_VIEW,uri);i.addCategory(Intent.CATEGORY_BROWSABLE);startActivity(i);}catch(ActivityNotFoundException e){Toast.makeText(this,"No hay navegador disponible",Toast.LENGTH_SHORT).show();}}
  @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
  @Override protected void onSaveInstanceState(@NonNull Bundle out){if(web!=null)web.saveState(out);super.onSaveInstanceState(out);}
  @Override protected void onDestroy(){if(web!=null){web.stopLoading();web.clearHistory();web.removeAllViews();web.destroy();web=null;}super.onDestroy();}
}
