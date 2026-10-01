package com.playershype.admin.v01;

import android.net.http.SslError;
import android.os.Bundle;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends ComponentActivity {
  private WebView web;
  private String hotfixJs = "";

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    hotfixJs = readAsset("admin-hotfix.js");
    web = new WebView(this);
    setContentView(web);

    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(false);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    WebView.setWebContentsDebuggingEnabled(false);

    WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
        .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
        .build();

    web.setWebViewClient(new WebViewClient() {
      @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return loader.shouldInterceptRequest(request.getUrl());
      }

      @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
        handler.cancel();
      }

      @Override public void onPageFinished(WebView view, String url) {
        super.onPageFinished(view, url);
        if (url != null && url.endsWith("/assets/admin.html") && hotfixJs != null && !hotfixJs.isEmpty()) {
          view.evaluateJavascript(hotfixJs, null);
        }
      }
    });

    web.loadUrl("https://appassets.androidplatform.net/assets/admin.html");

    getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
      @Override public void handleOnBackPressed() {
        if (web.canGoBack()) web.goBack(); else finish();
      }
    });
  }

  private String readAsset(String name) {
    try (InputStream in = getAssets().open(name); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      byte[] buffer = new byte[4096];
      int n;
      while ((n = in.read(buffer)) >= 0) out.write(buffer, 0, n);
      return out.toString(StandardCharsets.UTF_8.name());
    } catch (Exception e) {
      return "";
    }
  }

  @Override protected void onDestroy() {
    if (web != null) {
      web.stopLoading();
      web.clearHistory();
      web.removeAllViews();
      web.destroy();
      web = null;
    }
    super.onDestroy();
  }
}
