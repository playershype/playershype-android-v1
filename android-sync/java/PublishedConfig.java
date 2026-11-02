package com.playershype.shared;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.regex.*;
import java.util.zip.GZIPInputStream;
/** Bounded decoder for a public V2 snapshot embedded in the separate app HTML. */
public final class PublishedConfig {
 public static final int LIMIT=24*1024*1024;
 public static JSONObject validate(JSONObject c)throws Exception{
  if(c.optInt("schemaVersion")!=2||c.optJSONObject("home")==null||c.optJSONArray("tracks")==null||c.optJSONObject("raceDays")==null||c.optJSONObject("hypepredict")==null||c.optString("revision").isEmpty())throw new IOException("Configuración V2 incompleta");
  inspect(c,0);return c;
 }
 private static void inspect(Object v,int depth)throws Exception{
  if(depth>28)throw new IOException("Configuración demasiado profunda");
  if(v instanceof JSONObject){JSONObject o=(JSONObject)v;for(Iterator<String> i=o.keys();i.hasNext();){String k=i.next();if(k.matches("(?i).*(token|password|secret|authorization|promptMaestro|hypeScoreWeights|postRaceCalibration|rawSources|operationalNotes|baseScore|tacticalAdjustment).*"))throw new IOException("Campo privado bloqueado");inspect(o.get(k),depth+1);}}
  else if(v instanceof JSONArray){JSONArray a=(JSONArray)v;for(int i=0;i<a.length();i++)inspect(a.get(i),depth+1);}
  else if(v instanceof String&&Pattern.compile("<\\s*/?\\s*(script|iframe|object)\\b|javascript:",Pattern.CASE_INSENSITIVE).matcher((String)v).find())throw new IOException("Contenido ejecutable bloqueado");
 }
 public static JSONObject decode(String html)throws Exception{
  Matcher m=Pattern.compile("<script\\b[^>]*\\bid=['\"]phPublishedConfig['\"][^>]*>(.*?)</script\\s*>",Pattern.CASE_INSENSITIVE|Pattern.DOTALL).matcher(html);
  if(!m.find())throw new IOException("Falta la configuración de la app");JSONObject e=new JSONObject(m.group(1));
  if(!"gzip-base64".equals(e.optString("encoding")))throw new IOException("Formato de publicación incompatible");
  byte[] compressed=Base64.getDecoder().decode(e.getString("data"));ByteArrayOutputStream out=new ByteArrayOutputStream();
  try(InputStream in=new GZIPInputStream(new ByteArrayInputStream(compressed))){byte[] b=new byte[8192];int n,total=0;while((n=in.read(b))!=-1){total+=n;if(total>LIMIT)throw new IOException("Publicación demasiado grande");out.write(b,0,n);}}
  byte[] json=out.toByteArray();if(!sha256(json).equals(e.getString("sha256")))throw new IOException("Integridad de la publicación inválida");
  JSONObject c=validate(new JSONObject(new String(json,StandardCharsets.UTF_8)));if(!c.getString("revision").equals(e.getString("revision")))throw new IOException("Revisiones diferentes");return c;
 }
 public static String safeJson(String json){StringBuilder out=new StringBuilder();for(int i=0;i<json.length();i++){char c=json.charAt(i);if(Character.isSurrogate(c))out.append(String.format(Locale.ROOT,"\\u%04x",(int)c));else out.append(c);}return out.toString();}
 public static String sha256(byte[] data)throws Exception{return hex(MessageDigest.getInstance("SHA-256").digest(data));}
 public static String blobSha(byte[] data)throws Exception{MessageDigest d=MessageDigest.getInstance("SHA-1");d.update(("blob "+data.length+"\0").getBytes(StandardCharsets.UTF_8));return hex(d.digest(data));}
 private static String hex(byte[] b){StringBuilder s=new StringBuilder();for(byte v:b)s.append(String.format(Locale.ROOT,"%02x",v));return s.toString();}
}
