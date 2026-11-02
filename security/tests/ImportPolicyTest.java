package com.playershype.shared;
import org.junit.Test;
import static org.junit.Assert.*;
import java.nio.charset.StandardCharsets;
import java.io.IOException;
public class ImportPolicyTest {
 private byte[] utf8(String s){return s.getBytes(StandardCharsets.UTF_8);}
 @Test public void realTextAndJsonRemainImportable()throws Exception{ImportPolicy.validate("analisis.txt","text/plain",utf8("Carrera 2 · análisis 🐎"));ImportPolicy.validate("backup.json","application/json",utf8("{\"cards\":[]}"));ImportPolicy.validate("trabajo.html","text/html",utf8("<!doctype html><script type='application/json'>[]</script>"));}
 @Test public void filenamesAndMimeCannotHideScripts(){assertThrows(Exception.class,()->ImportPolicy.validate("photo.png","image/png",utf8("<svg onload='bad()'>")));assertThrows(Exception.class,()->ImportPolicy.validate("photo.jpg","image/png",new byte[]{(byte)255,(byte)216,(byte)255}));assertThrows(Exception.class,()->ImportPolicy.validate("report.pdf.exe","application/pdf",utf8("%PDF-1.7")));assertThrows(Exception.class,()->ImportPolicy.validate("../backup.json","application/json",utf8("{}")));}
 @Test public void corruptAndOversizeImportsRejected(){assertThrows(Exception.class,()->ImportPolicy.validate("backup.json","application/json",utf8("{\"a\":1} trailing")));assertThrows(Exception.class,()->ImportPolicy.validate("empty.txt","text/plain",new byte[0]));assertThrows(Exception.class,()->ImportPolicy.validate("raw.txt","text/plain",new byte[]{0,1}));assertThrows(Exception.class,()->ImportPolicy.validate("large.txt","text/plain",new byte[ImportPolicy.LIMIT+1]));}
 @Test public void deepJsonBlockedBeforeParser(){String deep="[".repeat(10000)+"0"+"]".repeat(10000);assertThrows(IOException.class,()->JsonBounds.parse(deep,ImportPolicy.LIMIT));}
 @Test public void prototypePollutionKeysBlocked(){for(String key:new String[]{"__proto__","constructor","prototype"})assertThrows(Exception.class,()->JsonBounds.parse("{\""+key+"\":{\"admin\":true}}",1000));}
 @Test public void bracesInQuotedStringsAreNotDepth()throws Exception{assertEquals("[[[{{{",JsonBounds.object("{\"a\":\"[[[{{{\"}",100).getString("a"));}
 @Test public void realPdfAndImagesPass()throws Exception{ImportPolicy.validate("report.pdf","application/pdf",utf8("%PDF-1.7\nfixture"));ImportPolicy.validate("silk.png","image/png",new byte[]{(byte)137,80,78,71,13,10,26,10});}
}
