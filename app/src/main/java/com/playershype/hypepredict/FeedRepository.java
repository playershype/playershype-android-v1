package com.playershype.hypepredict;

import org.json.JSONArray;
import org.json.JSONObject;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Pure data operations retained for HypePredict feed imports; never executes HTML. */
public final class FeedRepository {
  private FeedRepository() {}

  public static void validate(JSONArray cards) throws Exception {
    if (cards == null || cards.length() == 0) throw new IllegalArgumentException("Empty feed");
    for (int i = 0; i < cards.length(); i++) {
      JSONObject card = cards.getJSONObject(i);
      JSONObject event = card.getJSONObject("event");
      if (event.getString("track").trim().isEmpty()) throw new IllegalArgumentException("Empty track");
      LocalDate.parse(event.getString("date"));
      card.getJSONArray("races");
    }
  }

  private static String key(JSONObject card) throws Exception {
    JSONObject event = card.getJSONObject("event");
    String track = Normalizer.normalize(event.getString("track"), Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT)
        .replaceFirst("^hipodromo\\s+", "").trim();
    return track + "|" + event.getString("date");
  }

  public static JSONArray merge(JSONArray previous, JSONArray incoming) throws Exception {
    validate(incoming);
    Map<String, JSONObject> byEvent = new LinkedHashMap<>();
    for (int i = 0; i < previous.length(); i++) {
      JSONObject card = previous.getJSONObject(i);
      byEvent.put(key(card), card);
    }
    for (int i = 0; i < incoming.length(); i++) {
      JSONObject card = incoming.getJSONObject(i);
      byEvent.put(key(card), card);
    }
    List<JSONObject> sorted = new ArrayList<>(byEvent.values());
    sorted.sort(Comparator.comparing((JSONObject card) -> card.optJSONObject("event").optString("date")).reversed());
    JSONArray result = new JSONArray();
    for (int i = 0; i < Math.min(30, sorted.size()); i++) result.put(sorted.get(i));
    return result;
  }

  public static String script(String html, String id, boolean optional) {
    Matcher scripts = Pattern.compile("<script\\b([^>]*)>(.*?)</script\\s*>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL).matcher(html);
    Pattern identity = Pattern.compile("\\bid\\s*=\\s*(['\"])" + Pattern.quote(id) + "\\1", Pattern.CASE_INSENSITIVE);
    Pattern jsonType = Pattern.compile("\\btype\\s*=\\s*(['\"])application/json\\1", Pattern.CASE_INSENSITIVE);
    while (scripts.find()) {
      if (identity.matcher(scripts.group(1)).find() && jsonType.matcher(scripts.group(1)).find()) return scripts.group(2).trim();
    }
    if (optional) return "[]";
    throw new IllegalArgumentException("Missing JSON data: " + id);
  }
}
