package com.playershype.app;

import org.junit.Test;
import static org.junit.Assert.*;

public class UrlPolicyTest {
  @Test public void ownedHttpsAssetsAreInternal() {
    assertTrue(UrlPolicy.isInternal("https://appassets.androidplatform.net/assets/index.html"));
    assertFalse(UrlPolicy.isAllowedExternal("https://appassets.androidplatform.net/assets/index.html"));
  }
  @Test public void externalHttpsGoesToBrowser() {
    assertTrue(UrlPolicy.isAllowedExternal("https://playershype.net/hypepredict-track-hub-1"));
    assertFalse(UrlPolicy.isInternal("https://playershype.net"));
  }
  @Test public void unsafeAndMalformedLinksAreBlocked() {
    String[] blocked = {null, "", " ", "http://playershype.net", "file:///etc/passwd", "content://provider/item", "javascript:alert(1)", "intent://playershype.net", "data:text/html,test", "https://user:pass@playershype.net", "https:///missing-host", "https://bad host/"};
    for (String url : blocked) { assertFalse(url, UrlPolicy.isAllowedExternal(url)); assertFalse(url, UrlPolicy.isInternal(url)); }
  }
  @Test public void deceptiveInternalHostsAreExternal() {
    assertFalse(UrlPolicy.isInternal("https://appassets.androidplatform.net.evil.example/assets/index.html"));
  }
}
