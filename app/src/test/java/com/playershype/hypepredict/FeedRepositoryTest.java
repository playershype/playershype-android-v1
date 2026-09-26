package com.playershype.hypepredict;
import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;
public class FeedRepositoryTest {
 private JSONObject card(String track,String date,String name,double score)throws Exception{
  return new JSONObject().put("event",new JSONObject().put("track",track).put("date",date)).put("races",new JSONArray().put(new JSONObject().put("raceNumber",1).put("horses",new JSONArray().put(new JSONObject().put("name",name).put("model",new JSONObject().put("hypeScore",score))))));
 }
 @Test public void correctionReplacesAliasAndPreservesScore()throws Exception{
  JSONArray old=new JSONArray().put(card("Hipódromo Camarero","2026-09-19","Original",8.4)).put(card("Camarero","2026-09-18","Anterior",7.3));
  JSONArray result=FeedRepository.merge(old,new JSONArray().put(card("CAMARERO","2026-09-19","Corregido",9.17)));
  assertEquals(2,result.length());JSONObject horse=result.getJSONObject(0).getJSONArray("races").getJSONObject(0).getJSONArray("horses").getJSONObject(0);
  assertEquals("Corregido",horse.getString("name"));assertEquals(9.17,horse.getJSONObject("model").getDouble("hypeScore"),0);assertEquals("2026-09-18",result.getJSONObject(1).getJSONObject("event").getString("date"));
 }
 @Test public void keepsNewestThirtyCards()throws Exception{
  JSONArray old=new JSONArray();for(int i=1;i<=31;i++)old.put(card("Camarero",String.format("2026-08-%02d",i),"Horse",8));
  JSONArray result=FeedRepository.merge(old,new JSONArray().put(card("Camarero","2026-09-25","Today",9)));
  assertEquals(30,result.length());assertEquals("2026-09-25",result.getJSONObject(0).getJSONObject("event").getString("date"));
 }
 @Test public void rejectsEmptyOrInvalidData()throws Exception{
  assertThrows(Exception.class,()->FeedRepository.validate(new JSONArray()));
  assertThrows(Exception.class,()->FeedRepository.validate(new JSONArray().put(card("Camarero","2026-02-31","Horse",8))));
  assertThrows(Exception.class,()->FeedRepository.validate(new JSONArray().put(card("","2026-09-25","Horse",8))));
  FeedRepository.validate(new JSONArray().put(card("Camarero","2026-09-25","Horse",8)));
 }
 @Test public void extractsJsonWithoutExecutingScripts()throws Exception{
  String html="<script>throw new Error('never execute');</script><script type='application/json' id='embeddedData'>[{\"safe\":true}]</script>";
  assertEquals("[{\"safe\":true}]",FeedRepository.script(html,"embeddedData",false));assertEquals("[]",FeedRepository.script(html,"embeddedTrackRegistry",true));
  assertThrows(Exception.class,()->FeedRepository.script("<html>Access denied</html>","embeddedData",false));
 }
}
