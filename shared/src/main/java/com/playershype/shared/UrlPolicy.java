package com.playershype.shared;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
public final class UrlPolicy {
  public static final String INTERNAL_HOST="appassets.androidplatform.net";
  private UrlPolicy(){}
  public static boolean isInternal(String raw){URI u=parse(raw);return u!=null&&"https".equals(lower(u.getScheme()))&&INTERNAL_HOST.equals(lower(u.getHost()))&&u.getUserInfo()==null&&(u.getPort()==-1||u.getPort()==443);}
  public static boolean isAllowedExternal(String raw){URI u=parse(raw);if(u==null)return false;String s=lower(u.getScheme()),h=lower(u.getHost());return "https".equals(s)&&h!=null&&!h.trim().isEmpty()&&u.getUserInfo()==null&&!INTERNAL_HOST.equals(h);}
  private static URI parse(String raw){if(raw==null||raw.trim().isEmpty())return null;try{return new URI(raw.trim());}catch(URISyntaxException e){return null;}}
  private static String lower(String v){return v==null?null:v.toLowerCase(Locale.ROOT);}
}
