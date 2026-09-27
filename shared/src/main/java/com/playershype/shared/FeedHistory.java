package com.playershype.shared;
import java.time.LocalDate;
import java.util.*;
import org.json.*;
/** Merge already-projected publications by track/date without losing the offline history. */
public final class FeedHistory {
 private FeedHistory(){}
 public static JSONArray merge(JSONArray cached,JSONArray fresh)throws Exception{
  Map<String,JSONObject> cards=new LinkedHashMap<>();LocalDate latest=LocalDate.MIN;
  for(JSONArray group:new JSONArray[]{cached,fresh})for(int i=0;i<group.length();i++){
   JSONObject c=group.getJSONObject(i),e=c.getJSONObject("event");LocalDate d=LocalDate.parse(e.getString("date"));
   cards.put(e.getString("track").toLowerCase(Locale.ROOT)+"|"+d,c);if(d.isAfter(latest))latest=d;
  }
  final LocalDate cutoff=latest.minusDays(30);List<JSONObject> sorted=new ArrayList<>();
  for(JSONObject c:cards.values())if(!LocalDate.parse(c.getJSONObject("event").getString("date")).isBefore(cutoff))sorted.add(c);
  sorted.sort((a,b)->b.optJSONObject("event").optString("date").compareTo(a.optJSONObject("event").optString("date")));
  JSONArray result=new JSONArray();for(JSONObject c:sorted){if(result.length()==100)break;result.put(c);}return result;
 }
}
