package com.playershype.shared;

import android.app.Activity;
import android.app.AlertDialog;
import androidx.core.content.FileProvider;
import android.content.Intent;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.database.Cursor;
import android.util.Base64;
import androidx.webkit.JavaScriptReplyProxy;
import org.json.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.ExecutorService;

/** Native file operations are bounded and use user-selected Storage Access Framework URIs. */
final class ExportController {
  private static final int SAVE=7101,PICK=7102,MAX=32*1024*1024;
  private final SecureActivity activity;private final ExecutorService io;
  private File file;private OutputStream out;private long expected,written;
  private String transfer,mime,pendingId;private JavaScriptReplyProxy pendingReply;
  ExportController(SecureActivity activity,ExecutorService io){this.activity=activity;this.io=io;File folder=new File(activity.getCacheDir(),"exports");File[] old=folder.listFiles();if(old!=null)for(File item:old)if(item.isFile()&&System.currentTimeMillis()-item.lastModified()>86400000L)item.delete();}
  static String name(String raw){if(raw==null||raw.length()>120||raw.contains("/")||raw.contains("\\")||raw.contains("..")||raw.indexOf('\u0000')>=0)throw new IllegalArgumentException("Invalid filename");return raw.replaceAll("[^\\p{L}\\p{N} ._-]","_");}
  static boolean mimeAllowed(String type){return Arrays.asList("application/pdf","application/json","text/plain","text/html","text/csv","text/xml","application/xml","image/png","image/jpeg","image/webp","application/octet-stream").contains(type);}
  void dispatch(JSONObject m,JavaScriptReplyProxy reply,boolean admin)throws Exception{
    String id=m.getString("id"),action=m.getString("action");
    try{
      switch(action){
        case "begin":
          if(pendingReply!=null||out!=null)throw new IllegalStateException("Export in progress");
          expected=m.getLong("size");if(expected<0||expected>MAX)throw new IllegalArgumentException("Size limit");
          mime=m.getString("mime").split(";",2)[0].trim().toLowerCase(Locale.ROOT);if(!mimeAllowed(mime))throw new IllegalArgumentException("MIME blocked");
          if(!admin&&(mime.equals("text/html")||mime.equals("application/json")||mime.equals("application/octet-stream")))throw new IllegalArgumentException("Public export type blocked");
          transfer=UUID.randomUUID().toString();File dir=new File(activity.getCacheDir(),"exports");if(!dir.isDirectory()&&!dir.mkdirs())throw new IOException();
          file=new File(dir,transfer+"-"+name(m.getString("name")));out=new FileOutputStream(file);written=0;SecureActivity.respond(reply,id,true,transfer);break;
        case "chunk":
          require(m);String chunk=m.getString("data");if(chunk.length()>262144)throw new IllegalArgumentException("Chunk size limit");byte[] bytes=Base64.decode(chunk,Base64.DEFAULT);if(written+bytes.length>expected)throw new IllegalArgumentException("Transfer size mismatch");out.write(bytes);written+=bytes.length;SecureActivity.respond(reply,id,true,"");break;
        case "finish":
          require(m);if(written!=expected)throw new IllegalArgumentException("Incomplete transfer");out.close();out=null;pendingId=id;pendingReply=reply;
          if(m.optBoolean("directSave",false)){save();}else new AlertDialog.Builder(activity).setTitle("Exportar archivo").setItems(new String[]{"Guardar archivo","Compartir"},(d,which)->{try{if(which==0)save();else share();}catch(Exception e){SecureActivity.respond(pendingReply,pendingId,false,"No se pudo abrir el selector");close();}}).setOnCancelListener(d->{SecureActivity.respond(pendingReply,pendingId,false,"Cancelado");close();}).show();break;
        case "abort":require(m);close();SecureActivity.respond(reply,id,true,"");break;
        case "pick":
          if(!admin||pendingReply!=null)throw new IllegalArgumentException("Import blocked");pendingId=id;pendingReply=reply;
          Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true).putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"application/json","text/plain","text/html","application/pdf","text/csv","text/xml","application/xml","image/png","image/jpeg","image/webp"});activity.startActivityForResult(pick,PICK);break;
        default:throw new IllegalArgumentException("Unknown action");
      }
    }catch(Exception e){SecureActivity.respond(reply,id,false,"Operación rechazada: "+e.getClass().getSimpleName());close();}
  }
  private void save(){Intent save=new Intent(Intent.ACTION_CREATE_DOCUMENT).setType(mime).addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,file.getName().substring(transfer.length()+1));activity.startActivityForResult(save,SAVE);}
  private void share(){Uri uri=FileProvider.getUriForFile(activity,activity.getPackageName()+".exports",file);Intent intent=new Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM,uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);intent.setClipData(android.content.ClipData.newRawUri("Export",uri));activity.startActivity(Intent.createChooser(intent,"Compartir archivo"));SecureActivity.respond(pendingReply,pendingId,true,"");file=null;close();}
  private void require(JSONObject m)throws Exception{if(transfer==null||!transfer.equals(m.getString("transfer"))||out==null)throw new IllegalArgumentException("Invalid transfer");}
  void onResult(int request,int result,Intent data){
    if(request!=SAVE&&request!=PICK)return;final JavaScriptReplyProxy reply=pendingReply;final String id=pendingId;if(reply==null)return;
    if(result!=Activity.RESULT_OK||data==null){SecureActivity.respond(reply,id,false,"Cancelado");close();return;}
    final File source=file;
    io.execute(()->{try{
      String value="";
      if(request==SAVE){Uri uri=data.getData();if(uri==null||!"content".equals(uri.getScheme()))throw new IOException();try(InputStream in=new FileInputStream(source);OutputStream dest=activity.getContentResolver().openOutputStream(uri,"w")){if(dest==null)throw new IOException();byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)dest.write(b,0,n);}}
      else{
        ArrayList<Uri> uris=new ArrayList<>();if(data.getClipData()!=null){if(data.getClipData().getItemCount()>15)throw new IOException("File limit");for(int i=0;i<data.getClipData().getItemCount();i++)uris.add(data.getClipData().getItemAt(i).getUri());}else if(data.getData()!=null)uris.add(data.getData());
        JSONArray files=new JSONArray();int total=0;
        for(Uri uri:uris){if(!"content".equals(uri.getScheme()))throw new IOException();String type=activity.getContentResolver().getType(uri);if(type==null||!mimeAllowed(type))throw new IOException("MIME blocked");String filename="import";try(Cursor c=activity.getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){if(c!=null&&c.moveToFirst())filename=name(c.getString(0));}
          ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(InputStream in=activity.getContentResolver().openInputStream(uri)){if(in==null)throw new IOException();byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){total+=n;if(total>MAX)throw new IOException("Import too large");bytes.write(b,0,n);}}
          files.put(new JSONObject().put("name",filename).put("mime",type).put("data",Base64.encodeToString(bytes.toByteArray(),Base64.NO_WRAP)));
        }value=files.toString();
      }
      final String answer=value;activity.runOnUiThread(()->{SecureActivity.respond(reply,id,true,answer);close();});
    }catch(Exception e){activity.runOnUiThread(()->{SecureActivity.respond(reply,id,false,"No se pudo completar el archivo");close();});}});
  }
  void close(){try{if(out!=null)out.close();}catch(IOException ignored){}out=null;if(file!=null)file.delete();file=null;transfer=null;pendingReply=null;pendingId=null;}
}
