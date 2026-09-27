package com.playershype.shared;

import android.content.Context;
import android.util.AtomicFile;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import java.util.regex.*;
import org.json.*;

/** Legacy read-only adapter pending verified Core endpoint provisioning. */
public final class PublicFeedStore {
  private static final int LIMIT=16*1024*1024;
  private final AtomicFile cache;
  private final PublicProjection projection;
  private final String template;
  private JSONObject current;
  public PublicFeedStore(Context context)throws Exception{
    projection=new PublicProjection(new JSONObject(read(context.getAssets().open("public-projection.json"),LIMIT)));
    template=read(context.getAssets().open("hypepredict/public-template.html"),LIMIT);
    cache=new AtomicFile(new File(context.getFilesDir(),"public-feed-v1.json"));
    try{current=normalize(new JSONObject(read(cache.openRead(),LIMIT)),"cached");}
    catch(Exception ignored){current=normalize(new JSONObject(read(context.getAssets().open("hypepredict/public-seed.json"),LIMIT)),"bundled");}
  }
  private JSONObject normalize(JSONObject input,String origin)throws Exception{
    JSONObject out=projection.feed(input);
    String hash=hex(MessageDigest.getInstance("SHA-256").digest((out.getJSONArray("cards").toString()+out.getJSONArray("tracks").toString()).getBytes(StandardCharsets.UTF_8)));
    String latest="";JSONArray cards=out.getJSONArray("cards");for(int i=0;i<cards.length();i++){String d=cards.getJSONObject(i).getJSONObject("event").getString("date");if(d.compareTo(latest)>0)latest=d;}
    return out.put("revision",hash).put("contentHash",hash).put("latestDate",latest).put("origin",origin).put("checkedAt",input.optString("checkedAt","")).put("sourceUrl",input.optString("sourceUrl",""));
  }
  public synchronized JSONObject snapshot()throws Exception{return new JSONObject(current.toString());}
  public synchronized String document()throws Exception{
    JSONObject meta=snapshot();meta.remove("cards");meta.remove("tracks");
    return template.replace("__HP_PUBLIC_CARDS__",safe(current.getJSONArray("cards"))).replace("__HP_PUBLIC_TRACKS__",safe(current.getJSONArray("tracks"))).replace("__HP_PUBLIC_META__",safe(meta));
  }
  public synchronized JSONObject refresh()throws Exception{
    String hub=get("https://playershype.net/hypepredict-track-hub-1",2*1024*1024),source=null;
    Matcher m=Pattern.compile("href\\s*=\\s*['\"](https://hypepredict-[a-z0-9-]+\\.players-hype1\\.workers\\.dev/[^'\"<>\\s]*)['\"]",Pattern.CASE_INSENSITIVE).matcher(hub);
    while(m.find()){
      String candidate=m.group(1).replace("&amp;","&");URI u=new URI(candidate);
      if(u.getHost().equals("hypepredict-live.players-hype1.workers.dev")||u.getHost().equals("hypepredict-results.players-hype1.workers.dev")||u.getPath().startsWith("/api/"))continue;
      if(source!=null&&!source.equals(candidate))throw new IOException("Varias fuentes publicadas. Se conserva la copia anterior.");source=candidate;
    }
    if(source==null)throw new IOException("Fuente pública no disponible. Se conserva la copia anterior.");
    String html=get(source,LIMIT);
    JSONObject input=new JSONObject().put("cards",new JSONArray(jsonScript(html,"embeddedData"))).put("tracks",new JSONArray(jsonScript(html,"embeddedTrackRegistry"))).put("checkedAt",Instant.now().toString()).put("sourceUrl",source);
    JSONObject verified=projection.feed(input);
    input.put("cards",FeedHistory.merge(current.getJSONArray("cards"),verified.getJSONArray("cards")));
    JSONObject next=normalize(input,"published");
    byte[] data=next.toString().getBytes(StandardCharsets.UTF_8);if(data.length>LIMIT)throw new IOException("Publication too large");
    FileOutputStream out=null;try{out=cache.startWrite();out.write(data);cache.finishWrite(out);current=next;}catch(Exception e){if(out!=null)cache.failWrite(out);throw e;}
    return snapshot();
  }
  static String jsonScript(String html,String id)throws Exception{
    Matcher m=Pattern.compile("<script\\b[^>]*\\bid\\s*=\\s*['\"]"+Pattern.quote(id)+"['\"][^>]*>(.*?)</script\\s*>",Pattern.CASE_INSENSITIVE|Pattern.DOTALL).matcher(html);
    if(!m.find())throw new IOException("Missing published JSON");return m.group(1);
  }
  private static String get(String raw,int limit)throws Exception{
    URI uri=new URI(raw);String host=uri.getHost();
    if(!"https".equals(uri.getScheme())||uri.getUserInfo()!=null||host==null||!(host.equals("playershype.net")||host.matches("hypepredict-[a-z0-9-]+\\.players-hype1\\.workers\\.dev")))throw new IOException("Source blocked");
    HttpURLConnection c=(HttpURLConnection)uri.toURL().openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(15000);c.setReadTimeout(20000);c.setRequestProperty("Accept","text/html");
    try{if(c.getResponseCode()!=200)throw new IOException("Publication unavailable");String mime=c.getContentType();if(mime==null||!mime.toLowerCase(Locale.ROOT).startsWith("text/html"))throw new IOException("Unexpected content type");return read(c.getInputStream(),limit);}finally{c.disconnect();}
  }
  static String read(InputStream in,int limit)throws IOException{try(InputStream source=in;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n,total=0;while((n=source.read(b))!=-1){total+=n;if(total>limit)throw new IOException("Size limit");out.write(b,0,n);}return out.toString("UTF-8");}}
  private static String safe(Object v){return v.toString().replace("<","\\u003c").replace("\u2028","\\u2028").replace("\u2029","\\u2029");}
  private static String hex(byte[] b){StringBuilder s=new StringBuilder();for(byte v:b)s.append(String.format(Locale.ROOT,"%02x",v));return s.toString();}
}
