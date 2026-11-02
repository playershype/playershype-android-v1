package com.playershype.shared;
import org.junit.Test;
import static org.junit.Assert.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.GZIPOutputStream;
public class AtomicGitPublisherTest {
 static JSONObject config(String revision)throws Exception{return new JSONObject().put("schemaVersion",2).put("revision",revision).put("home",new JSONObject()).put("tracks",new JSONArray()).put("raceDays",new JSONObject()).put("hypepredict",new JSONObject());}
 static String html(String json,String revision)throws Exception{ByteArrayOutputStream out=new ByteArrayOutputStream();try(GZIPOutputStream zip=new GZIPOutputStream(out)){zip.write(json.getBytes(StandardCharsets.UTF_8));}return "<!doctype html><script id=\"phPublishedConfig\" type=\"application/json\">"+new JSONObject().put("schemaVersion",1).put("encoding","gzip-base64").put("revision",revision).put("sha256",PublishedConfig.sha256(json.getBytes(StandardCharsets.UTF_8))).put("data",Base64.getEncoder().encodeToString(out.toByteArray()))+"</script>";}
 static JSONObject bundle(String target,FakeApi api)throws Exception{String json=config("new").toString();return new JSONObject().put("config",json).put("html",html(json,"new")).put("revision","new").put("target",target).put("baseHash",PublishedConfig.sha256(api.original)).put("sha256",PublishedConfig.sha256(json.getBytes(StandardCharsets.UTF_8)));}
 static class FakeApi implements AtomicGitPublisher.Api {
  final byte[] original;final Map<String,byte[]> blobs=new HashMap<>();JSONArray base=new JSONArray(),next;int writes,commits,patches;boolean conflict,corrupt,unauthorized;
  FakeApi()throws Exception{original=config("old").toString().getBytes(StandardCharsets.UTF_8);String sha=PublishedConfig.blobSha(original);blobs.put(sha,original);base.put(new JSONObject().put("path",AtomicGitPublisher.DASHBOARD).put("sha",sha));base.put(new JSONObject().put("path","README.md").put("sha","keep"));}
  public JSONObject request(String method,String path,JSONObject body)throws Exception{
   if(unauthorized)throw new IOException("GitHub 401");
   if(method.equals("GET")&&path.startsWith("/git/ref/heads/"))return new JSONObject().put("object",new JSONObject().put("sha","head"));
   if(method.equals("GET")&&path.startsWith("/git/commits/"))return new JSONObject().put("tree",new JSONObject().put("sha",path.endsWith("head")?"base":"next"));
   if(method.equals("GET")&&path.startsWith("/git/trees/")){JSONArray t=path.contains("/base?")?base:next;if(corrupt&&path.contains("/next?"))t=new JSONArray();return new JSONObject().put("tree",t);}
   if(method.equals("GET")&&path.startsWith("/git/blobs/"))return new JSONObject().put("content",Base64.getEncoder().encodeToString(blobs.get(path.substring("/git/blobs/".length()))));
   writes++;
   if(path.equals("/git/blobs")){byte[] b=Base64.getDecoder().decode(body.getString("content"));String sha=PublishedConfig.blobSha(b);blobs.put(sha,b);return new JSONObject().put("sha",sha);}
   if(path.equals("/git/trees")){next=new JSONArray(base.toString());JSONArray changes=body.getJSONArray("tree");for(int i=0;i<changes.length();i++){JSONObject entry=changes.getJSONObject(i);for(int j=next.length()-1;j>=0;j--)if(next.getJSONObject(j).getString("path").equals(entry.getString("path")))next.remove(j);next.put(entry);}return new JSONObject().put("sha","next");}
   if(path.equals("/git/commits")){commits++;assertEquals("head",body.getJSONArray("parents").getString(0));return new JSONObject().put("sha","commit");}
   if(method.equals("PATCH")){assertFalse(body.getBoolean("force"));if(conflict)throw new IOException("GitHub 422 non-fast-forward");patches++;return new JSONObject();}
   throw new IOException("Unexpected "+method+" "+path);
  }
  String content(String path)throws Exception{for(int i=0;i<next.length();i++){JSONObject e=next.getJSONObject(i);if(e.getString("path").equals(path))return new String(blobs.get(e.getString("sha")),StandardCharsets.UTF_8);}return null;}
 }
 @Test public void bothRoutesShareOneCommitAndRevision()throws Exception{FakeApi api=new FakeApi();JSONObject r=new AtomicGitPublisher(api,"main").publish(bundle("both",api));assertTrue(r.getBoolean("verified"));assertEquals(1,api.commits);assertEquals(1,api.patches);assertEquals(2,r.getJSONArray("paths").length());assertEquals("new",new JSONObject(api.content(AtomicGitPublisher.DASHBOARD)).getString("revision"));assertEquals("new",PublishedConfig.decode(api.content(AtomicGitPublisher.APP)).getString("revision"));assertEquals("README.md",api.next.getJSONObject(0).getString("path"));}
 @Test public void appOnlyPreservesDashboard()throws Exception{FakeApi api=new FakeApi();new AtomicGitPublisher(api,"main").publish(bundle("app",api));assertEquals(new String(api.original,StandardCharsets.UTF_8),api.content(AtomicGitPublisher.DASHBOARD));assertNotNull(api.content(AtomicGitPublisher.APP));}
 @Test public void dashboardOnlyPreservesApp()throws Exception{FakeApi api=new FakeApi();new AtomicGitPublisher(api,"main").publish(bundle("dashboard",api));assertNull(api.content(AtomicGitPublisher.APP));assertEquals("new",new JSONObject(api.content(AtomicGitPublisher.DASHBOARD)).getString("revision"));}
 @Test public void staleDraftDoesNotWrite()throws Exception{FakeApi api=new FakeApi();JSONObject b=bundle("both",api).put("baseHash","stale");assertThrows(IOException.class,()->new AtomicGitPublisher(api,"main").publish(b));assertEquals(0,api.writes);}
 @Test public void concurrentRefUpdateNeverForces()throws Exception{FakeApi api=new FakeApi();api.conflict=true;assertThrows(IOException.class,()->new AtomicGitPublisher(api,"main").publish(bundle("both",api)));assertEquals(0,api.patches);}
 @Test public void authFailureNeverClaimsSuccess()throws Exception{FakeApi api=new FakeApi();api.unauthorized=true;assertThrows(IOException.class,()->new AtomicGitPublisher(api,"main").publish(bundle("both",api)));assertEquals(0,api.writes);}
 @Test public void failedReadbackNeverClaimsSuccess()throws Exception{FakeApi api=new FakeApi();api.corrupt=true;assertThrows(IOException.class,()->new AtomicGitPublisher(api,"main").publish(bundle("both",api)));}
 @Test public void mismatchIsRejectedBeforeNetworkWrites()throws Exception{FakeApi api=new FakeApi();JSONObject b=bundle("both",api).put("html",html(config("other").toString(),"other"));assertThrows(IOException.class,()->new AtomicGitPublisher(api,"main").publish(b));assertEquals(0,api.writes);}
 @Test public void corruptCompressedPayloadRejected()throws Exception{String h=html(config("new").toString(),"new");assertThrows(Exception.class,()->PublishedConfig.decode(h.replace("gzip-base64","unknown")));}
 @Test public void privateFieldsRejected()throws Exception{JSONObject c=config("new").put("promptMaestro","private");assertThrows(IOException.class,()->PublishedConfig.validate(c));}
}
