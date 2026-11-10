package com.playershype.shared;

import android.content.Context;
import android.util.AtomicFile;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.regex.*;
import org.json.*;

/** Read-only HypePredict feed backed by the canonical GitHub-published app feed. */
public final class PublicFeedStore {
  private static final int LIMIT=16*1024*1024;
  private static final String SOURCE_HOST="raw.githubusercontent.com";
  private static final String SOURCE_PATH="/playershype/playershype-android-v1/main/docs/app/index.html";
  private static final String SOURCE_URL="https://"+SOURCE_HOST+SOURCE_PATH;
  private final AtomicFile cache;
  private final PublicProjection projection;
  private final String template;
  private JSONObject current;
  private JSONObject publishedConfig;
  private String configOrigin="bundled",checkedAt="";
  private final AtomicFile configCache;
  private final String dashboardTemplate;
  private final Context appContext;
  private boolean configLoaded;
  private final Object refreshLock = new Object();
  private String publicationEtag;
  private static final ZoneId PUERTO_RICO = ZoneId.of("America/Puerto_Rico");
  private static final String[] HOME_FIELDS = {"schemaVersion", "revision", "home", "live", "channels", "tv", "latest"};
  private static final String[] PREDICT_FIELDS = {"title", "description", "image", "version"};

  public PublicFeedStore(Context context)throws Exception{
    appContext=context.getApplicationContext();
    projection=new PublicProjection(new JSONObject(read(context.getAssets().open("public-projection.json"),LIMIT)));
    template=read(context.getAssets().open("hypepredict/public-template.html"),LIMIT);
    dashboardTemplate=read(context.getAssets().open("sync/dashboard.html"),LIMIT);
    configCache=new AtomicFile(new File(context.getFilesDir(),"published-config-v2.json"));
    cache=new AtomicFile(new File(context.getFilesDir(),"public-feed-v1.json"));
    try{current=normalize(new JSONObject(read(cache.openRead(),LIMIT)),"cached");}
    catch(Exception ignored){current=normalize(new JSONObject(read(context.getAssets().open("hypepredict/public-seed.json"),LIMIT)),"bundled");}
  }

  // Called only by the background WebView resource handler or sync executor.
  // Parsing a full archive during Activity.onCreate delays the first frame.
  private synchronized void ensureConfig()throws Exception{
    if(configLoaded)return;
    try{publishedConfig=PublishedConfig.validate(new JSONObject(read(configCache.openRead(),PublishedConfig.LIMIT)));configOrigin="cached";}
    catch(Exception ignored){try{publishedConfig=PublishedConfig.validate(new JSONObject(read(appContext.getAssets().open("sync/published-seed.json"),PublishedConfig.LIMIT)));}catch(Exception absent){publishedConfig=null;}}
    configLoaded=true;
  }

  private JSONObject normalize(JSONObject input,String origin)throws Exception{
    JSONObject out=projection.feed(input);
    String hash=hex(MessageDigest.getInstance("SHA-256").digest((out.getJSONArray("cards").toString()+out.getJSONArray("tracks").toString()).getBytes(StandardCharsets.UTF_8)));
    String latest="";JSONArray cards=out.getJSONArray("cards");for(int i=0;i<cards.length();i++){String d=cards.getJSONObject(i).getJSONObject("event").getString("date");if(d.compareTo(latest)>0)latest=d;}
    return out.put("revision",hash).put("contentHash",hash).put("latestDate",latest).put("origin",origin).put("checkedAt",input.optString("checkedAt","")).put("sourceUrl",input.optString("sourceUrl",""));
  }

  private JSONObject syncMetadata() throws JSONException {
    return new JSONObject().put("origin", configOrigin).put("checkedAt", checkedAt);
  }

  /** Stream the validated on-disk bytes without serializing the entire archive again. */
  public synchronized InputStream configurationStream() throws Exception {
    ensureConfig();
    if(publishedConfig==null)return new ByteArrayInputStream("{}".getBytes(StandardCharsets.UTF_8));
    return "bundled".equals(configOrigin)?appContext.getAssets().open("sync/published-seed.json"):configCache.openRead();
  }

  public synchronized String homeConfiguration() throws Exception {
    return homeConfiguration(null);
  }

  public synchronized String homeConfiguration(String selectedDate) throws Exception {
    String date = selectedDate == null ? LocalDate.now(PUERTO_RICO).toString() : LocalDate.parse(selectedDate).toString();
    ensureConfig();
    if (publishedConfig == null) return "{}";
    JSONObject home = homeProjection(publishedConfig, date);
    return PublishedConfig.safeJson(home.put("__sync", syncMetadata()).toString());
  }

  static JSONObject homeProjection(JSONObject config, String date) throws JSONException {
    JSONObject home = new JSONObject(config, HOME_FIELDS);
    JSONObject predict = config.optJSONObject("hypepredict");
    home.put("hypepredict", predict == null ? new JSONObject() : new JSONObject(predict, PREDICT_FIELDS));
    JSONObject analyses = predict == null ? null : predict.optJSONObject("analyses");
    JSONObject daysByTrack = config.optJSONObject("raceDays");
    JSONArray tracks = config.optJSONArray("tracks");
    JSONArray visible = new JSONArray();
    if (tracks != null && daysByTrack != null && analyses != null) {
      for (int i = 0; i < tracks.length(); i++) {
        JSONObject track = tracks.optJSONObject(i);
        if (track != null && hasPublishedRace(daysByTrack.opt(track.optString("id")), analyses, date)) {
          visible.put(track);
        }
      }
    }
    return home.put("tracks", visible).put("__homeDate", date);
  }

  private static boolean hasPublishedRace(Object history, JSONObject analyses, String date) {
    JSONArray days = history instanceof JSONArray ? (JSONArray) history
        : history instanceof JSONObject ? ((JSONObject) history).optJSONArray("days") : null;
    if (days == null && history instanceof JSONObject) days = new JSONArray().put(history);
    if (days == null) return false;
    for (int i = 0; i < days.length(); i++) {
      JSONObject day = days.optJSONObject(i);
      if (day == null || !date.equals(day.optString("date"))) continue;
      JSONArray races = day.optJSONArray("races");
      if (races == null) return false;
      for (int j = 0; j < races.length(); j++) {
        JSONObject race = races.optJSONObject(j);
        JSONObject analysis = race == null ? null : analyses.optJSONObject(race.optString("id"));
        if (analysis != null && "published".equals(analysis.optString("status"))) return true;
      }
      return false;
    }
    return false;
  }

  public synchronized JSONObject snapshot()throws Exception{
    ensureConfig();
    if(publishedConfig!=null)return new JSONObject().put("schemaVersion",2).put("revision",publishedConfig.getString("revision")).put("origin","published-app").put("cards",new JSONArray()).put("tracks",publishedConfig.getJSONArray("tracks"));
    return new JSONObject(current.toString());
  }

  public synchronized String document()throws Exception{
    ensureConfig();
    if(publishedConfig!=null)return dashboardTemplate;
    JSONObject meta=snapshot();meta.remove("cards");meta.remove("tracks");
    return template.replace("__HP_PUBLIC_CARDS__",safe(current.getJSONArray("cards"))).replace("__HP_PUBLIC_TRACKS__",safe(current.getJSONArray("tracks"))).replace("__HP_PUBLIC_META__",safe(meta));
  }

  public JSONObject refresh() throws Exception {
    synchronized (refreshLock) {
      ensureConfig();
      PublicationResponse response = get(SOURCE_URL, LIMIT, publicationEtag);
      if (response.html == null) return snapshot();

      String html = response.html;
      if (html.contains("id=\"phPublishedConfig\"")) {
        PublishedConfig.Snapshot decoded = PublishedConfig.decodeSnapshot(html);
        JSONObject next = decoded.config;
        synchronized (this) {
          write(configCache, decoded.json);
          publishedConfig = next;
          configOrigin = "github";
          checkedAt = Instant.now().toString();
        }
      } else {
        JSONObject input = new JSONObject()
            .put("cards", new JSONArray(jsonScript(html, "embeddedData")))
            .put("tracks", new JSONArray(jsonScript(html, "embeddedTrackRegistry")))
            .put("checkedAt", Instant.now().toString())
            .put("sourceUrl", SOURCE_URL);
        JSONObject verified = projection.feed(input);
        input.put("cards", FeedHistory.merge(current.getJSONArray("cards"), verified.getJSONArray("cards")));
        JSONObject next = normalize(input, "github");
        byte[] data = next.toString().getBytes(StandardCharsets.UTF_8);
        if (data.length > LIMIT) throw new IOException("Publication too large");
        write(cache, data);
        synchronized (this) {
          current = next;
        }
      }
      publicationEtag = response.etag;
      return snapshot();
    }
  }

  private static void write(AtomicFile destination, byte[] bytes) throws IOException {
    FileOutputStream output = destination.startWrite();
    try {
      output.write(bytes);
      destination.finishWrite(output);
    } catch (IOException error) {
      destination.failWrite(output);
      throw error;
    }
  }

  private static final class PublicationResponse {
    final String html;
    final String etag;

    PublicationResponse(String html, String etag) {
      this.html = html;
      this.etag = etag;
    }
  }

  static String jsonScript(String html,String id)throws Exception{
    Matcher m=Pattern.compile("<script\\b[^>]*\\bid\\s*=\\s*['\"]"+Pattern.quote(id)+"['\"][^>]*>(.*?)</script\\s*>",Pattern.CASE_INSENSITIVE|Pattern.DOTALL).matcher(html);
    if(!m.find())throw new IOException("Missing published JSON");return m.group(1);
  }

  private static PublicationResponse get(String raw, int limit, String etag) throws Exception {
    URI uri=new URI(raw);String host=uri.getHost();
    if(!"https".equals(uri.getScheme())||uri.getUserInfo()!=null||uri.getPort()!=-1||!SOURCE_HOST.equalsIgnoreCase(host)||!SOURCE_PATH.equals(uri.getPath()))throw new IOException("Source blocked");
    HttpURLConnection c=(HttpURLConnection)uri.toURL().openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(15000);c.setReadTimeout(20000);c.setUseCaches(false);c.setRequestProperty("Accept","text/html");c.setRequestProperty("Cache-Control","no-cache");
    if (etag != null) c.setRequestProperty("If-None-Match", etag);
    try {
      int status = c.getResponseCode();
      if (status == 304 && etag != null) return new PublicationResponse(null, etag);
      if (status != 200) throw new IOException("Publication unavailable");
      String mime = c.getContentType();
      if (mime == null || !(mime.toLowerCase(Locale.ROOT).startsWith("text/plain")
          || mime.toLowerCase(Locale.ROOT).startsWith("text/html"))) {
        throw new IOException("Unexpected content type");
      }
      String nextEtag = c.getHeaderField("ETag");
      if (nextEtag != null && nextEtag.length() > 256) nextEtag = null;
      return new PublicationResponse(read(c.getInputStream(), limit), nextEtag);
    } finally {
      c.disconnect();
    }
  }

  static String read(InputStream in,int limit)throws IOException{try(InputStream source=in;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n,total=0;while((n=source.read(b))!=-1){total+=n;if(total>limit)throw new IOException("Size limit");out.write(b,0,n);}return out.toString("UTF-8");}}
  private static String safe(Object v){return v.toString().replace("<","\\u003c").replace("\u2028","\\u2028").replace("\u2029","\\u2029");}
  private static String hex(byte[] b){StringBuilder s=new StringBuilder();for(byte v:b)s.append(String.format(Locale.ROOT,"%02x",v));return s.toString();}
}
