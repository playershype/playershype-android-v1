package com.playershype.shared;
import java.io.IOException;
import java.nio.*;
import java.nio.charset.*;
import java.util.*;
/** File-provider labels are untrusted: match extension, declared MIME and bytes. */
public final class ImportPolicy {
 public static final int LIMIT=32*1024*1024;
 private ImportPolicy(){}
 public static void validate(String name,String mime,byte[] bytes)throws Exception{
  if(name==null||name.length()>120||name.contains("/")||name.contains("\\")||name.contains("..")||name.indexOf('\0')>=0||bytes==null||bytes.length==0||bytes.length>LIMIT)throw new IOException("Invalid imported file");
  int dot=name.lastIndexOf('.');String ext=dot<0?"":name.substring(dot+1).toLowerCase(Locale.ROOT),type=mime==null?"":mime.split(";",2)[0].trim().toLowerCase(Locale.ROOT);
  if(ext.equals("pdf")){require(type,"application/pdf");if(!new String(bytes,0,Math.min(1024,bytes.length),StandardCharsets.ISO_8859_1).contains("%PDF-"))throw new IOException("Invalid PDF signature");return;}
  if(ext.equals("png")){require(type,"image/png");if(!prefix(bytes,new int[]{137,80,78,71,13,10,26,10}))throw new IOException("Invalid PNG signature");return;}
  if(ext.equals("jpg")||ext.equals("jpeg")){require(type,"image/jpeg");if(!prefix(bytes,new int[]{255,216,255}))throw new IOException("Invalid JPEG signature");return;}
  if(ext.equals("webp")){require(type,"image/webp");if(bytes.length<12||!new String(bytes,0,4,StandardCharsets.US_ASCII).equals("RIFF")||!new String(bytes,8,4,StandardCharsets.US_ASCII).equals("WEBP"))throw new IOException("Invalid WebP signature");return;}
  Map<String,String> texts=new HashMap<>();texts.put("json","application/json");texts.put("txt","text/plain");texts.put("csv","text/csv");texts.put("xml","application/xml");texts.put("html","text/html");texts.put("htm","text/html");
  if(!texts.containsKey(ext))throw new IOException("Unsupported file extension");
  if(!type.equals(texts.get(ext))&&!type.equals("text/plain")&&!type.equals("application/octet-stream")&&!(ext.equals("xml")&&type.equals("text/xml")))throw new IOException("File type mismatch");
  String text=StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
  if(text.indexOf('\0')>=0)throw new IOException("Binary data in text file");if(text.startsWith("\uFEFF"))text=text.substring(1);
  if(ext.equals("json"))JsonBounds.parse(text,LIMIT);
 }
 private static void require(String type,String expected)throws IOException{if(!type.equals(expected)&&!type.equals("application/octet-stream"))throw new IOException("File type mismatch");}
 private static boolean prefix(byte[] b,int[] p){if(b.length<p.length)return false;for(int i=0;i<p.length;i++)if((b[i]&255)!=p[i])return false;return true;}
}
