package com.playershype.shared;
import org.json.*;
import org.junit.Test;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.zip.GZIPOutputStream;
import static org.junit.Assert.*;
public class PublishedSnapshotTest {
 private String html(String json,String revision,String hash) throws Exception {
  ByteArrayOutputStream out=new ByteArrayOutputStream();try(GZIPOutputStream zip=new GZIPOutputStream(out)){zip.write(json.getBytes(StandardCharsets.UTF_8));}
  return "<script id=\"phPublishedConfig\" type=\"application/json\">"+new JSONObject().put("encoding","gzip-base64").put("revision",revision).put("sha256",hash).put("data",Base64.getEncoder().encodeToString(out.toByteArray()))+"</script>";
 }
 @Test public void exactVerifiedBytesAreRetainedForStreamingAndAtomicCache() throws Exception {
  String json="{\"schemaVersion\":2,\"revision\":\"r1\",\"home\":{},\"tracks\":[],\"raceDays\":{},\"hypepredict\":{},\"text\":\"Horse \\ud83c\\udfc7 lone \\ud83c\"}";
  byte[] bytes=json.getBytes(StandardCharsets.UTF_8);
  PublishedConfig.Snapshot snapshot=PublishedConfig.decodeSnapshot(html(json,"r1",PublishedConfig.sha256(bytes)));
  assertArrayEquals(bytes,snapshot.json);assertEquals("r1",snapshot.config.getString("revision"));
  assertEquals(new JSONObject(json).getString("text"),snapshot.config.getString("text"));
 }
 @Test public void alteredHashNeverReturnsACacheSnapshot() throws Exception {
  String json="{\"schemaVersion\":2,\"revision\":\"r1\",\"home\":{},\"tracks\":[],\"raceDays\":{},\"hypepredict\":{}}";
  try{PublishedConfig.decodeSnapshot(html(json,"r1","wrong"));fail("Modified data must be rejected");}catch(java.io.IOException expected){assertTrue(expected.getMessage().contains("Integridad"));}
 }
}
