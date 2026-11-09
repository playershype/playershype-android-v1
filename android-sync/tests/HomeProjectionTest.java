package com.playershype.shared;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

import static org.junit.Assert.*;

public class HomeProjectionTest {
  @Test
  public void countsPublishedIdsOnceAndPreservesEditableHeroPage() throws Exception {
    JSONObject config=new JSONObject("{\"schemaVersion\":2,\"revision\":\"r2\",\"home\":{\"hero\":{\"page\":{\"title\":\"Destacado\",\"body\":\"Contenido completo\"}}},\"tracks\":[{\"id\":\"a\",\"races\":99}],\"raceDays\":{\"a\":{\"days\":[{\"date\":\"2026-11-08\",\"races\":[{\"id\":\"a1\"},{\"id\":\"a1\"},{\"id\":\"a2\"},{\"id\":\"a3\"}]}]}},\"hypepredict\":{\"analyses\":{\"a1\":{\"status\":\"published\"},\"a2\":{\"status\":\"draft\"}}}}");
    JSONObject home=PublicFeedStore.homeProjection(config,"2026-11-08");
    assertEquals(1,home.getJSONArray("tracks").getJSONObject(0).getInt("publishedRaces"));
    assertEquals(1,home.getJSONArray("tracks").getJSONObject(0).getInt("races"));
    assertEquals(99,config.getJSONArray("tracks").getJSONObject(0).getInt("races"));
    assertEquals("Contenido completo",home.getJSONObject("home").getJSONObject("hero").getJSONObject("page").getString("body"));
  }

  @Test
  public void includesOnlyTracksWithPublishedRacesForRequestedDay() throws Exception {
    JSONObject config = new JSONObject(
        "{\"schemaVersion\":2,\"revision\":\"r1\",\"home\":{\"hero\":{\"title\":\"PlayersHype 🏇\"}},"
        + "\"tracks\":[{\"id\":\"a\"},{\"id\":\"b\"},{\"id\":\"c\"},{\"id\":\"d\"}],"
        + "\"raceDays\":{"
        + "\"a\":{\"date\":\"2026-11-03\",\"races\":[{\"id\":\"a1\"}]},"
        + "\"b\":{\"days\":[{\"date\":\"2026-11-03\",\"races\":[{\"id\":\"b1\"}]}]},"
        + "\"c\":[{\"date\":\"2026-11-03\",\"races\":[{\"id\":\"c1\"}]}],"
        + "\"d\":{\"date\":\"2026-11-02\",\"races\":[{\"id\":\"a1\"}]}},"
        + "\"hypepredict\":{\"title\":\"Predict\",\"analyses\":{"
        + "\"a1\":{\"status\":\"published\"},\"b1\":{\"status\":\"published\"},"
        + "\"c1\":{\"status\":\"draft\"}}},\"raceDayHistory\":{},\"horseData\":{}}");
    JSONObject home = PublicFeedStore.homeProjection(config, "2026-11-03");
    JSONArray tracks = home.getJSONArray("tracks");
    assertEquals(2, tracks.length());
    assertEquals("a", tracks.getJSONObject(0).getString("id"));
    assertEquals("2026-11-03", home.getString("homeDate"));
    assertEquals("2026-11-03", tracks.getJSONObject(0).getString("date"));
    assertEquals(1, tracks.getJSONObject(0).getInt("publishedRaces"));
    assertEquals("b", tracks.getJSONObject(1).getString("id"));
    assertEquals("r1", home.getString("revision"));
    assertEquals("Predict", home.getJSONObject("hypepredict").getString("title"));
    assertFalse(home.has("raceDays"));
    assertFalse(home.has("raceDayHistory"));
    assertFalse(home.has("horseData"));
    assertFalse(home.getJSONObject("hypepredict").has("analyses"));
    assertEquals(4, config.getJSONArray("tracks").length());
    assertFalse(config.getJSONArray("tracks").getJSONObject(0).has("publishedRaces"));
    assertEquals(0, PublicFeedStore.homeProjection(config, "2026-11-04").getJSONArray("tracks").length());
    String escaped = PublishedConfig.safeJson(home.toString());
    assertEquals("PlayersHype 🏇", new JSONObject(escaped).getJSONObject("home")
        .getJSONObject("hero").getString("title"));
  }
}
