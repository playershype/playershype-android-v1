package com.playershype.shared;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import androidx.webkit.JavaScriptReplyProxy;
import org.json.JSONArray;
import org.json.JSONObject;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.net.ssl.HttpsURLConnection;
import java.io.*;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.ExecutorService;

/**
 * ADMIN-only publisher for the generated public index.html.
 * GitHub credentials never enter the HTML export and are encrypted with Android Keystore.
 */
final class PublishController {
  private static final int MAX = 32 * 1024 * 1024;
  private static final String PREFS = "playershype.publisher.v1";
  private static final String KEY_ALIAS = "PlayersHypeGitHubPublisherKey";
  private static final String API_VERSION = "2022-11-28";

  private final SecureActivity activity;
  private final ExecutorService io;
  private final SharedPreferences prefs;
  private File file;
  private OutputStream out;
  private String transfer;
  private String publishTarget;
  private String publishMime;
  private long expected, written;

  PublishController(SecureActivity activity, ExecutorService io) {
    this.activity = activity;
    this.io = io;
    this.prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    pruneBackups();
  }

  boolean handles(String action) {
    return action != null && (action.startsWith("publisher") || action.startsWith("publish"));
  }

  void dispatch(JSONObject m, JavaScriptReplyProxy reply, boolean admin) throws Exception {
    String id = m.getString("id"), action = m.getString("action");
    if (!admin) throw new IllegalArgumentException("Admin only");
    try {
      switch (action) {
        case "publisherStatus":
          SecureActivity.respond(reply, id, true, status().toString());
          break;
        case "publisherConfigure":
          configure(m);
          SecureActivity.respond(reply, id, true, status().toString());
          break;
        case "publisherClearToken":
          prefs.edit().remove("token").apply();
          SecureActivity.respond(reply, id, true, status().toString());
          break;
        case "publisherHistory":
          SecureActivity.respond(reply, id, true, history().toString());
          break;
        case "publisherTest":
          io.execute(() -> {try{String result=testConnection().toString();activity.runOnUiThread(() -> SecureActivity.respond(reply,id,true,result));}catch(Exception e){activity.runOnUiThread(() -> SecureActivity.respond(reply,id,false,safeError(e)));}});
          break;
        case "publishBegin":
          begin(m, reply, id);
          break;
        case "publishChunk":
          chunk(m, reply, id);
          break;
        case "publishFinish":
          finish(m, reply, id);
          break;
        case "publishAbort":
          abort();
          SecureActivity.respond(reply, id, true, "");
          break;
        default:
          throw new IllegalArgumentException("Unknown publisher action");
      }
    } catch (Exception e) {
      abort();
      SecureActivity.respond(reply, id, false, safeError(e));
    }
  }

  private void configure(JSONObject m) throws Exception {
    String owner = cleanPart(m.optString("owner"), "owner");
    String repo = cleanPart(m.optString("repo"), "repo");
    String branch = cleanBranch(m.optString("branch", "main"));
    String legacyPath = m.optString("path", "docs/index.html");
    String livePath = cleanPath(m.optString("livePath", legacyPath));
    String appPath = cleanPath(m.optString("appPath", "docs/app/index.html"));
    String liveUrl = m.optString("liveUrl", "").trim();
    if (!liveUrl.isEmpty() && !liveUrl.matches("https://[^\s]{3,500}")) throw new IllegalArgumentException("Live URL must be HTTPS");
    String token = normalizeToken(m.optString("token", ""));
    SharedPreferences.Editor e = prefs.edit()
      .putString("owner", owner).putString("repo", repo).putString("branch", branch)
      .putString("path", livePath).putString("livePath", livePath).putString("appPath", appPath)
      .putString("liveUrl", liveUrl);
    if (!token.isEmpty()) {
      if (token.length() < 20 || token.length() > 500) throw new IllegalArgumentException("Invalid token");
      e.putString("token", encrypt(token));
    }
    e.apply();
  }

  private JSONObject status() throws Exception {
    String owner = prefs.getString("owner", "");
    String repo = prefs.getString("repo", "");
    String branch = prefs.getString("branch", "main");
    String livePath = prefs.getString("livePath", prefs.getString("path", "docs/index.html"));
    String appPath = prefs.getString("appPath", "docs/app/index.html");
    String liveUrl = prefs.getString("liveUrl", "");
    boolean hasToken = false;
    try { hasToken = !decryptToken().isEmpty(); } catch (Exception ignored) {}
    return new JSONObject()
      .put("configured", !owner.isEmpty() && !repo.isEmpty() && hasToken)
      .put("owner", owner).put("repo", repo).put("branch", branch)
      .put("path", livePath).put("livePath", livePath).put("appPath", appPath).put("liveUrl", liveUrl)
      .put("dashboardPath", AtomicGitPublisher.DASHBOARD).put("combinedPublishing",true).put("hasToken", hasToken)
      .put("lastPublishedAt", prefs.getString("lastPublishedAt", ""))
      .put("lastCommit", prefs.getString("lastCommit", ""))
      .put("lastLivePublishedAt", prefs.getString("lastLivePublishedAt", ""))
      .put("lastLiveCommit", prefs.getString("lastLiveCommit", ""))
      .put("lastAppPublishedAt", prefs.getString("lastAppPublishedAt", ""))
      .put("lastAppCommit", prefs.getString("lastAppCommit", ""))
      .put("lastBackup", prefs.getString("lastBackup", ""))
      .put("pendingBackup", prefs.getString("pendingBackup", ""))
      .put("pendingAt", prefs.getString("pendingAt", ""))
      .put("lastError", prefs.getString("lastError", ""))
      .put("publishState", prefs.getString("pendingBackup", "").isEmpty() ? (prefs.getString("lastPublishedAt", "").isEmpty() ? "idle" : "published") : "pending")
      .put("backupCount", backupFiles().length);
  }

  private void begin(JSONObject m, JavaScriptReplyProxy reply, String id) throws Exception {
    if (out != null) throw new IllegalStateException("Publish in progress");
    JSONObject s = status();
    if (!s.getBoolean("configured")) throw new IllegalStateException("Configure GitHub publisher first");
    publishTarget = cleanTarget(m.optString("target", "live"));
    expected = m.getLong("size");
    if (expected <= 0 || expected > MAX) throw new IllegalArgumentException("Publish size limit");
    String mime = m.optString("mime", "text/html").split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
    if (!"text/html".equals(mime) && !"application/json".equals(mime)) throw new IllegalArgumentException("Only public HTML or a validated publication bundle may be published");
    publishMime = mime;
    transfer = UUID.randomUUID().toString();
    File dir = new File(activity.getCacheDir(), "publish");
    if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("Cannot create publish cache");
    file = new File(dir, transfer + "-" + publishTarget + "-index.html");
    out = new FileOutputStream(file);
    written = 0;
    SecureActivity.respond(reply, id, true, transfer);
  }

  private void chunk(JSONObject m, JavaScriptReplyProxy reply, String id) throws Exception {
    require(m);
    String data = m.getString("data");
    if (data.length() > 270000) throw new IllegalArgumentException("Chunk size limit");
    byte[] bytes = Base64.decode(data, Base64.DEFAULT);
    if (written + bytes.length > expected) throw new IllegalArgumentException("Transfer size mismatch");
    out.write(bytes); written += bytes.length;
    SecureActivity.respond(reply, id, true, "");
  }

  private void finish(JSONObject m, JavaScriptReplyProxy reply, String id) throws Exception {
    require(m);
    if (written != expected) throw new IllegalArgumentException("Incomplete transfer");
    out.close(); out = null;
    final File source = file;
    final String mime = publishMime;
    final String target = publishTarget == null ? "live" : publishTarget;
    file = null; transfer = null; publishTarget = null;
    final String message = sanitizeCommitMessage(m.optString("message", "app".equals(target) ? "Update PlayersHype App" : "Update HypePredict Live"));
    io.execute(() -> {
      try {
        File backup = backup(source, target);
        String pendingAt = new Date().toInstant().toString();
        prefs.edit().putString("lastBackup", backup.getName()).putString("pendingBackup", backup.getName()).putString("pendingAt", pendingAt).remove("lastError").apply();
        JSONObject result = "application/json".equals(mime) ? publishBundle(source, target) : publish(source, message, target);
        result.put("backup", backup.getName());
        SharedPreferences.Editor published = prefs.edit()
          .putString("lastPublishedAt", result.getString("publishedAt"))
          .putString("lastCommit", result.optString("commit"))
          .putString("lastBackup", backup.getName())
          .remove("pendingBackup").remove("pendingAt").remove("lastError");
        if ("app".equals(target) || "both".equals(target)) published.putString("lastAppPublishedAt", result.getString("publishedAt")).putString("lastAppCommit", result.optString("commit"));
        if (!"app".equals(target)) published.putString("lastLivePublishedAt", result.getString("publishedAt")).putString("lastLiveCommit", result.optString("commit"));
        published.apply();
        addHistory(result);
        source.delete();
        activity.runOnUiThread(() -> SecureActivity.respond(reply, id, true, result.toString()));
      } catch (Exception e) {
        prefs.edit().putString("lastError", safeError(e)).apply();
        source.delete();
        activity.runOnUiThread(() -> SecureActivity.respond(reply, id, false, safeError(e)));
      }
    });
  }

  private JSONObject publishBundle(File source,String target)throws Exception {
    JSONObject bundle=new JSONObject(new String(readAll(source,MAX),StandardCharsets.UTF_8));
    if(!target.equals(bundle.optString("target")))throw new IOException("Destino de publicación diferente");
    String owner=prefs.getString("owner",""),repo=prefs.getString("repo",""),branch=prefs.getString("branch","main"),token=decryptToken();
    if(owner.isEmpty()||repo.isEmpty()||token.isEmpty())throw new IOException("Configura GitHub primero");
    if(!"playershype".equalsIgnoreCase(owner)||!"playershype-android-v1".equalsIgnoreCase(repo)||!"main".equals(branch))throw new IOException("Esta app lee playershype/playershype-android-v1, branch main. Configura ese destino antes de publicar.");
    String base="https://api.github.com/repos/"+enc(owner)+"/"+enc(repo);
    AtomicGitPublisher.Api api=(method,path,body)->{
      HttpsURLConnection c=open(base+path,method,token);
      try{if(body!=null){byte[] data=body.toString().getBytes(StandardCharsets.UTF_8);c.setDoOutput(true);c.setFixedLengthStreamingMode(data.length);try(OutputStream output=c.getOutputStream()){output.write(data);}}
        int code=c.getResponseCode();String response=readResponse(c,code);if(code<200||code>=300)throw new IOException("GitHub "+code+": "+apiMessage(response));return new JSONObject(response);
      }finally{c.disconnect();}
    };
    return new AtomicGitPublisher(api,branch).publish(bundle).put("publishedAt",new Date().toInstant().toString());
  }

  private JSONObject publish(File source, String message, String target) throws Exception {
    String owner = prefs.getString("owner", ""), repo = prefs.getString("repo", ""), branch = prefs.getString("branch", "main"), liveUrl = prefs.getString("liveUrl", "");
    String path = "app".equals(target) ? prefs.getString("appPath", "docs/app/index.html") : prefs.getString("livePath", prefs.getString("path", "docs/index.html"));
    String token = decryptToken();
    if (owner.isEmpty() || repo.isEmpty() || token.isEmpty()) throw new IllegalStateException("Publisher not configured");
    String endpoint = "https://api.github.com/repos/" + enc(owner) + "/" + enc(repo) + "/contents/" + encPath(path);
    String sha = currentSha(endpoint, branch, token);
    byte[] bytes = readAll(source, MAX);
    JSONObject body = new JSONObject().put("message", message).put("content", Base64.encodeToString(bytes, Base64.NO_WRAP)).put("branch", branch);
    if (sha != null && !sha.isEmpty()) body.put("sha", sha);
    HttpsURLConnection c = open(endpoint, "PUT", token);
    c.setDoOutput(true);
    byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
    c.setFixedLengthStreamingMode(payload.length);
    try (OutputStream o = c.getOutputStream()) { o.write(payload); }
    int code = c.getResponseCode();
    String response = readResponse(c, code);
    if (code != 200 && code != 201) throw new IOException("GitHub " + code + ": " + apiMessage(response));
    JSONObject json = new JSONObject(response), commit = json.optJSONObject("commit");
    String commitSha = commit == null ? "" : commit.optString("sha", "");
    return new JSONObject().put("ok", true).put("target", target).put("owner", owner).put("repo", repo).put("branch", branch).put("path", path).put("liveUrl", liveUrl).put("commit", commitSha).put("publishedAt", new Date().toInstant().toString());
  }

  private String currentSha(String endpoint, String branch, String token) throws Exception {
    HttpsURLConnection c = open(endpoint + "?ref=" + enc(branch), "GET", token);
    int code = c.getResponseCode();
    String response = readResponse(c, code);
    if (code == 404) return null;
    if (code != 200) throw new IOException("GitHub " + code + ": " + apiMessage(response));
    return new JSONObject(response).optString("sha", null);
  }

  private HttpsURLConnection open(String url, String method, String token) throws Exception {
    HttpsURLConnection c = (HttpsURLConnection) new URL(url).openConnection();
    c.setRequestMethod(method); c.setInstanceFollowRedirects(false); c.setConnectTimeout(20000); c.setReadTimeout(45000);
    c.setRequestProperty("Accept", "application/vnd.github+json");
    c.setRequestProperty("Authorization", "Bearer " + token);
    c.setRequestProperty("X-GitHub-Api-Version", API_VERSION);
    c.setRequestProperty("User-Agent", "PlayersHype-Admin/1.3.1");
    c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
    c.setUseCaches(false);
    return c;
  }

  private File backup(File source, String target) throws Exception {
    File dir = new File(activity.getFilesDir(), "live-backups");
    if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("Cannot create backup folder");
    String stamp = new SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(new Date());
    String extension;try(InputStream in=new FileInputStream(source)){extension=in.read()==123?".json":".html";}
    File dest = new File(dir, "PlayersHype-"+target+"-" + stamp + extension);
    copy(source, dest); pruneBackups(); return dest;
  }

  private void addHistory(JSONObject row) {
    try {
      JSONArray a = history();
      JSONArray out = new JSONArray(); out.put(row);
      for (int i = 0; i < Math.min(a.length(), 19); i++) out.put(a.get(i));
      prefs.edit().putString("history", out.toString()).apply();
    } catch (Exception ignored) {}
  }

  private JSONArray history() {
    try { return new JSONArray(prefs.getString("history", "[]")); }
    catch (Exception e) { return new JSONArray(); }
  }

  private File[] backupFiles() {
    File dir = new File(activity.getFilesDir(), "live-backups");
    File[] files = dir.listFiles((d, n) -> (n.endsWith(".html") || n.endsWith(".json")));
    return files == null ? new File[0] : files;
  }

  private void pruneBackups() {
    File[] files = backupFiles();
    Arrays.sort(files, Comparator.comparingLong(File::lastModified).reversed());
    for (int i = 20; i < files.length; i++) files[i].delete();
  }

  private String encrypt(String clear) throws Exception {
    Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
    c.init(Cipher.ENCRYPT_MODE, key());
    byte[] iv = c.getIV(), encrypted = c.doFinal(clear.getBytes(StandardCharsets.UTF_8)), all = new byte[iv.length + encrypted.length];
    System.arraycopy(iv, 0, all, 0, iv.length); System.arraycopy(encrypted, 0, all, iv.length, encrypted.length);
    return Base64.encodeToString(all, Base64.NO_WRAP);
  }

  private String decryptToken() throws Exception {
    String stored = prefs.getString("token", ""); if (stored.isEmpty()) return "";
    byte[] all = Base64.decode(stored, Base64.DEFAULT); if (all.length < 29) return "";
    byte[] iv = Arrays.copyOfRange(all, 0, 12), encrypted = Arrays.copyOfRange(all, 12, all.length);
    Cipher c = Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, iv));
    return new String(c.doFinal(encrypted), StandardCharsets.UTF_8);
  }

  private SecretKey key() throws Exception {
    KeyStore ks = KeyStore.getInstance("AndroidKeyStore"); ks.load(null);
    if (ks.containsAlias(KEY_ALIAS)) return (SecretKey) ks.getKey(KEY_ALIAS, null);
    KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
    kg.init(new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());
    return kg.generateKey();
  }

  private void require(JSONObject m) throws Exception {
    if (transfer == null || !transfer.equals(m.getString("transfer")) || out == null) throw new IllegalArgumentException("Invalid transfer");
  }

  void abort() {
    try { if (out != null) out.close(); } catch (IOException ignored) {}
    if (file != null) file.delete(); out = null; file = null; transfer = null; publishTarget = null; expected = written = 0;
  }

  private JSONObject testConnection() throws Exception {
    String owner = prefs.getString("owner", ""), repo = prefs.getString("repo", "");
    String token = decryptToken();
    if (owner.isEmpty() || repo.isEmpty() || token.isEmpty()) throw new IllegalStateException("Configure GitHub publisher first");
    String endpoint = "https://api.github.com/repos/" + enc(owner) + "/" + enc(repo);
    HttpsURLConnection c = open(endpoint, "GET", token);
    int code = c.getResponseCode();
    String response = readResponse(c, code);
    if (code != 200) throw new IOException("GitHub " + code + ": " + apiMessage(response));
    return new JSONObject().put("ok", true).put("owner", owner).put("repo", repo).put("message", "GitHub conectado");
  }

  private static String normalizeToken(String v) {
    if (v == null) return "";
    return v.replaceAll("[\u200B-\u200D\uFEFF]", "").replaceAll("\s+", "").trim();
  }

  private static String cleanTarget(String v) {
    v = v == null ? "live" : v.trim().toLowerCase(Locale.ROOT);
    if (!"live".equals(v) && !"app".equals(v) && !"both".equals(v) && !"dashboard".equals(v)) throw new IllegalArgumentException("Invalid publish target");
    return v;
  }

  private static String cleanPart(String v, String label) {
    v = v == null ? "" : v.trim();
    if (!v.matches("[A-Za-z0-9_.-]{1,100}")) throw new IllegalArgumentException("Invalid " + label);
    return v;
  }
  private static String cleanBranch(String v) {
    v = v == null ? "main" : v.trim();
    if (!v.matches("[A-Za-z0-9._/-]{1,150}") || v.contains("..") || v.startsWith("/") || v.endsWith("/")) throw new IllegalArgumentException("Invalid branch");
    return v;
  }
  private static String cleanPath(String v) {
    v = v == null ? "docs/index.html" : v.trim();
    if (!v.matches("[A-Za-z0-9._/-]{1,240}") || v.contains("..") || v.startsWith("/") || !v.toLowerCase(Locale.ROOT).endsWith(".html")) throw new IllegalArgumentException("Invalid HTML path");
    return v;
  }
  private static String sanitizeCommitMessage(String v) {
    v = v == null ? "Update HypePredict Live" : v.replaceAll("[\\r\\n\\t]+", " ").trim();
    if (v.isEmpty()) v = "Update HypePredict Live";
    return v.length() > 160 ? v.substring(0, 160) : v;
  }
  private static String enc(String v) throws Exception { return URLEncoder.encode(v, "UTF-8").replace("+", "%20"); }
  private static String encPath(String path) throws Exception {
    String[] parts = path.split("/"); StringBuilder b = new StringBuilder();
    for (String part : parts) { if (b.length() > 0) b.append('/'); b.append(enc(part)); }
    return b.toString();
  }
  private static byte[] readAll(File f, int max) throws Exception {
    try (InputStream in = new FileInputStream(f); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      byte[] buf = new byte[8192]; int n, total = 0;
      while ((n = in.read(buf)) != -1) { total += n; if (total > max) throw new IOException("File too large"); out.write(buf, 0, n); }
      return out.toByteArray();
    }
  }
  private static String readResponse(HttpsURLConnection c, int code) throws Exception {
    InputStream in = code >= 200 && code < 400 ? c.getInputStream() : c.getErrorStream();
    if (in == null) return "";
    try (InputStream x = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      byte[] b = new byte[4096]; int n, total = 0;
      while ((n = x.read(b)) != -1) { total += n; if(total>48*1024*1024)throw new IOException("GitHub response too large"); out.write(b, 0, n); }
      return out.toString(StandardCharsets.UTF_8.name());
    }
  }
  private static String apiMessage(String response) {
    try { return new JSONObject(response).optString("message", "Request rejected"); }
    catch (Exception e) { return response.length() > 180 ? response.substring(0, 180) : response; }
  }
  private static void copy(File a, File b) throws Exception {
    try (InputStream in = new FileInputStream(a); OutputStream out = new FileOutputStream(b)) { byte[] buf = new byte[8192]; int n; while ((n = in.read(buf)) != -1) out.write(buf, 0, n); }
  }
  private static String safeError(Exception e) {
    String m = e.getMessage(); if (m == null || m.trim().isEmpty()) m = e.getClass().getSimpleName();
    m = m.replaceAll("(?i)(gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)", "[token]");
    return m.length() > 260 ? m.substring(0, 260) : m;
  }
}
