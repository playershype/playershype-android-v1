package com.playershype.shared;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.LocalDate;
import org.json.JSONObject;
import org.json.JSONArray;

/** Public, read-only Camarero results. No user-selected host, redirect or credential. */
public final class PublicResults {
  private static final int LIMIT=1024*1024;
  private PublicResults(){}
  static String endpoint(String track,String date){
    if(!"CMR".equals(track)||date==null||!date.matches("20[0-9]{2}-[0-9]{2}-[0-9]{2}"))throw new IllegalArgumentException("Invalid results scope");
    LocalDate.parse(date);
    return "https://hypepredict-results.players-hype1.workers.dev/results?track=CMR&date="+date;
  }
  static String validate(String text,String track,String date)throws Exception{
    endpoint(track,date);
    JSONObject data=JsonBounds.object(text,LIMIT);
    String actual=data.optString("track","");
    if(!data.optBoolean("ok",false)||!date.equals(data.optString("date"))||!("Camarero".equalsIgnoreCase(actual)||"CMR".equals(actual)))throw new IOException("Results scope mismatch");
    JSONArray rows=data.getJSONArray("races");if(rows.length()>32)throw new IOException("Too many results");
    java.util.HashSet<Integer> seen=new java.util.HashSet<>();
    for(int i=0;i<rows.length();i++){JSONObject row=rows.getJSONObject(i);int n=row.getInt("raceNumber");if(n<1||n>32||!seen.add(n))throw new IOException("Invalid race number");}
    return data.toString();
  }
  public static String fetch(String track,String date)throws Exception{
    HttpURLConnection connection=(HttpURLConnection)new URL(endpoint(track,date)).openConnection();
    connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(12000);connection.setReadTimeout(15000);connection.setUseCaches(false);connection.setRequestProperty("Accept","application/json");connection.setRequestProperty("User-Agent","PlayersHype-Results/1.4.6");
    try{
      if(connection.getResponseCode()!=200||connection.getContentLengthLong()>LIMIT)throw new IOException("Results unavailable");
      try(java.io.InputStream stream=connection.getInputStream()){return validate(PublicFeedStore.read(stream,LIMIT),track,date);}
    }finally{connection.disconnect();}
  }
}
