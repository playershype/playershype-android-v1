package com.playershype.shared;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.json.*;
/** Bound hostile JSON before Android's recursive parser allocates nested objects. */
public final class JsonBounds {
 private JsonBounds(){}
 public static Object parse(String raw,int limit)throws Exception{
  if(raw==null||raw.length()>limit||raw.getBytes(StandardCharsets.UTF_8).length>limit)throw new IOException("JSON size limit");
  int depth=0;boolean quoted=false,escaped=false;
  for(int i=0;i<raw.length();i++){char c=raw.charAt(i);if(quoted){if(escaped)escaped=false;else if(c=='\\')escaped=true;else if(c=='"')quoted=false;}else if(c=='"')quoted=true;else if(c=='{'||c=='['){if(++depth>32)throw new IOException("JSON depth limit");}else if(c=='}'||c==']'){if(--depth<0)throw new IOException("Invalid JSON nesting");}}
  if(quoted||depth!=0)throw new IOException("Incomplete JSON");
  JSONTokener t=new JSONTokener(raw);Object value=t.nextValue();if(!(value instanceof JSONObject)&&!(value instanceof JSONArray)||t.nextClean()!=0)throw new IOException("Invalid JSON document");keys(value);return value;
 }
 private static void keys(Object value)throws Exception{if(value instanceof JSONObject){JSONObject o=(JSONObject)value;for(java.util.Iterator<String> i=o.keys();i.hasNext();){String k=i.next();if(k.equals("__proto__")||k.equals("prototype")||k.equals("constructor"))throw new IOException("Unsafe object key");keys(o.get(k));}}else if(value instanceof JSONArray){JSONArray a=(JSONArray)value;for(int i=0;i<a.length();i++)keys(a.get(i));}}
 public static JSONObject object(String raw,int limit)throws Exception{Object v=parse(raw,limit);if(!(v instanceof JSONObject))throw new IOException("Expected JSON object");return (JSONObject)v;}
}
