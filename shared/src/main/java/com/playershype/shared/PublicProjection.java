package com.playershype.shared;

import org.json.JSONArray;
import org.json.JSONObject;
import java.net.URI;
import java.time.LocalDate;
import java.util.Iterator;

/** An allowlist projection, never a blacklist-only private-data filter. */
public final class PublicProjection {
  private final JSONObject fields;
  public PublicProjection(JSONObject contract) throws Exception { fields=contract.getJSONObject("fields"); }
  public JSONObject feed(JSONObject input) throws Exception {
    if(input.has("schemaVersion") && input.getInt("schemaVersion")!=1) throw new IllegalArgumentException("Incompatible schema");
    JSONArray cards=(JSONArray)project(input.getJSONArray("cards"),"cards",0);
    if(cards.length()==0 || cards.length()>100) throw new IllegalArgumentException("Invalid card count");
    for(int i=0;i<cards.length();i++){
      JSONObject card=cards.getJSONObject(i),event=card.getJSONObject("event");
      LocalDate.parse(event.getString("date"));
      if(event.getString("track").trim().isEmpty()) throw new IllegalArgumentException("Missing track");
      JSONArray races=card.getJSONArray("races");
      if(races.length()==0||races.length()>40)throw new IllegalArgumentException("Invalid races");
      java.util.HashSet<Integer> ids=new java.util.HashSet<>();
      for(int j=0;j<races.length();j++){
        JSONObject race=races.getJSONObject(j);int n=race.getInt("raceNumber");
        if(n<1||n>99||!ids.add(n))throw new IllegalArgumentException("Invalid or duplicate race");
        if(race.getJSONArray("horses").length()>100)throw new IllegalArgumentException("Too many horses");
      }
    }
    JSONArray tracks=(JSONArray)project(input.optJSONArray("tracks") == null?new JSONArray():input.getJSONArray("tracks"),"tracks",0);
    if(tracks.length()>100)throw new IllegalArgumentException("Too many tracks");
    return new JSONObject().put("schemaVersion",1).put("cards",cards).put("tracks",tracks);
  }
  private Object project(Object value,String path,int depth) throws Exception {
    if(depth>24)throw new IllegalArgumentException("Nested data limit");
    if(value instanceof JSONObject){
      JSONObject src=(JSONObject)value,out=new JSONObject();JSONArray allowed=fields.optJSONArray(path);
      if(allowed==null)return out;
      for(int i=0;i<allowed.length();i++){
        String key=allowed.getString(i);if(!src.has(key))continue;
        Object raw=src.get(key);
        if((key.equals("art")||key.equals("image")||key.equals("url")) && raw instanceof String && !safeImageOrUrl((String)raw))throw new IllegalArgumentException("Invalid media URL");
        out.put(key,project(raw,path+"."+key,depth+1));
      }
      return out;
    }
    if(value instanceof JSONArray){JSONArray a=(JSONArray)value,out=new JSONArray();if(a.length()>500)throw new IllegalArgumentException("Array size limit");for(int i=0;i<a.length();i++)out.put(project(a.get(i),path+"[]",depth+1));return out;}
    if(value instanceof String){String text=(String)value;int max=path.endsWith(".art")?3000000:30000;if(text.length()>max)throw new IllegalArgumentException("Text size limit");if(text.indexOf('\u0000')>=0||text.toLowerCase(java.util.Locale.ROOT).contains("<script"))throw new IllegalArgumentException("Unsafe text");}
    return value;
  }
  public static boolean safeImageOrUrl(String raw){
    if(raw.isEmpty())return true;
    // Legacy bundled artwork is raster data only, never SVG/HTML or arbitrary data URLs.
    if(raw.matches("^data:image/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\\r\\n]+$"))return true;
    try{URI u=new URI(raw);return "https".equalsIgnoreCase(u.getScheme())&&u.getHost()!=null&&u.getUserInfo()==null&&!raw.contains("\"")&&!raw.contains("'");}catch(Exception e){return false;}
  }
}
