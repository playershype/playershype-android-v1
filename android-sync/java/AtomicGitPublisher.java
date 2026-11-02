package com.playershype.shared;
import org.json.*;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
/** Git objects are immutable. Only the final non-forced ref update publishes anything. */
public final class AtomicGitPublisher {
 public interface Api {JSONObject request(String method,String path,JSONObject body)throws Exception;}
 public static final String DASHBOARD="docs/app/config.json",APP="docs/app/index.html";
 private final Api api;private final String branch;
 public AtomicGitPublisher(Api api,String branch){this.api=api;this.branch=branch;}
 public JSONObject publish(JSONObject bundle)throws Exception{
  String target=bundle.getString("target");if(!Arrays.asList("both","app","dashboard").contains(target))throw new IOException("Destino inválido");
  String json=bundle.getString("config"),html=bundle.getString("html"),revision=bundle.getString("revision"),baseHash=bundle.getString("baseHash");
  JSONObject config=PublishedConfig.validate(new JSONObject(json)),embedded=PublishedConfig.decode(html);
  if(!revision.equals(config.getString("revision"))||!revision.equals(embedded.getString("revision"))||!PublishedConfig.sha256(json.getBytes(StandardCharsets.UTF_8)).equals(bundle.getString("sha256"))||!config.toString().equals(embedded.toString()))throw new IOException("Dashboard y App no contienen la misma revisión");
  String head=api.request("GET","/git/ref/heads/"+branch,null).getJSONObject("object").getString("sha");
  String baseTree=api.request("GET","/git/commits/"+head,null).getJSONObject("tree").getString("sha");
  JSONObject tree=api.request("GET","/git/trees/"+baseTree+"?recursive=1",null);if(tree.optBoolean("truncated"))throw new IOException("Árbol de repositorio incompleto");
  String current=find(tree.getJSONArray("tree"),DASHBOARD);if(current==null)throw new IOException("Falta la configuración publicada; no se sobrescribirá el repositorio");
  JSONObject blob=api.request("GET","/git/blobs/"+current,null);byte[] published=Base64.getMimeDecoder().decode(blob.getString("content"));
  if(!PublishedConfig.sha256(published).equals(baseHash))throw new IOException("Hay una publicación más reciente. Importa la versión publicada antes de volver a publicar; tu borrador se conserva.");
  JSONArray entries=new JSONArray();Map<String,String> expected=new LinkedHashMap<>();
  if(!"app".equals(target))add(entries,expected,DASHBOARD,json);
  if(!"dashboard".equals(target))add(entries,expected,APP,html);
  String nextTree=api.request("POST","/git/trees",new JSONObject().put("base_tree",baseTree).put("tree",entries)).getString("sha");
  String commit=api.request("POST","/git/commits",new JSONObject().put("message","PlayersHype · "+target+" · "+revision).put("tree",nextTree).put("parents",new JSONArray().put(head))).getString("sha");
  // A concurrent publisher creates a sibling commit and GitHub rejects this update.
  api.request("PATCH","/git/refs/heads/"+branch,new JSONObject().put("sha",commit).put("force",false));
  String verifiedTree=api.request("GET","/git/commits/"+commit,null).getJSONObject("tree").getString("sha");
  JSONObject verified=api.request("GET","/git/trees/"+verifiedTree+"?recursive=1",null);if(verified.optBoolean("truncated"))throw new IOException("No se pudo verificar el árbol publicado");
  for(Map.Entry<String,String> e:expected.entrySet())if(!e.getValue().equals(find(verified.getJSONArray("tree"),e.getKey())))throw new IOException("Commit creado pero su contenido no pudo verificarse. Revisa el historial antes de reintentar.");
  return new JSONObject().put("ok",true).put("verified",true).put("target",target).put("revision",revision).put("commit",commit).put("paths",new JSONArray(expected.keySet()));
 }
 private void add(JSONArray entries,Map<String,String> expected,String path,String content)throws Exception{
  byte[] bytes=content.getBytes(StandardCharsets.UTF_8);String sha=api.request("POST","/git/blobs",new JSONObject().put("encoding","base64").put("content",Base64.getEncoder().encodeToString(bytes))).getString("sha");
  if(!sha.equals(PublishedConfig.blobSha(bytes)))throw new IOException("GitHub recibió contenido diferente");
  expected.put(path,sha);entries.put(new JSONObject().put("path",path).put("mode","100644").put("type","blob").put("sha",sha));
 }
 private static String find(JSONArray tree,String path)throws Exception{for(int i=0;i<tree.length();i++){JSONObject e=tree.getJSONObject(i);if(path.equals(e.optString("path")))return e.getString("sha");}return null;}
}
