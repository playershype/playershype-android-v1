package com.playershype.shared;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Rect;
import android.graphics.drawable.Drawable;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import android.graphics.ColorFilter;
import android.graphics.PixelFormat;

/** Local vector marks for the public five-destination navigation. */
public final class UserNavIcon extends Drawable {
  private final int index;
  private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
  private boolean selected;
  public UserNavIcon(int index) { this.index=index; }
  public void select(boolean value) { selected=value;invalidateSelf(); }
  private void line(Canvas c,float... points) {
    Path p=new Path();p.moveTo(points[0],points[1]);
    for(int i=2;i<points.length;i+=2)p.lineTo(points[i],points[i+1]);
    c.drawPath(p,paint);
  }
  @Override public void draw(@NonNull Canvas canvas) {
    Rect b=getBounds();float size=Math.min(b.width(),b.height());
    canvas.save();canvas.translate(b.centerX()-size/2,b.centerY()-size/2);canvas.scale(size/32f,size/32f);
    paint.setStyle(Paint.Style.FILL);paint.setColor(selected?0xff123e59:Color.TRANSPARENT);
    canvas.drawRoundRect(1,1,31,31,10,10,paint);
    paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(1.65f);paint.setStrokeCap(Paint.Cap.ROUND);paint.setStrokeJoin(Paint.Join.ROUND);paint.setColor(selected?0xff52f4d3:0xffb4c8df);
    switch(index) {
      case 0: line(canvas,7,15,16,7,25,15);line(canvas,9,14,9,25,14,25,14,19,18,19,18,25,23,25,23,14);break;
      case 1: canvas.drawRoundRect(7,9,25,25,3,3,paint);line(canvas,7,14,25,14);line(canvas,12,7,12,11);line(canvas,20,7,20,11);line(canvas,11,18,14,18);line(canvas,18,18,21,18);line(canvas,11,22,14,22);break;
      case 2: {Path p=new Path();p.moveTo(10,23);p.cubicTo(3,11,10,6,16,6);p.cubicTo(22,6,29,11,22,23);canvas.drawPath(p,paint);line(canvas,8,22,12,22);line(canvas,20,22,24,22);line(canvas,18,11,13,17,18,17,14,23);break;}
      case 3: line(canvas,6,25,6,18,12,18,12,25);line(canvas,12,25,12,12,20,12,20,25);line(canvas,20,25,20,20,26,20,26,25);line(canvas,6,25,26,25);line(canvas,14,7,16,9,21,5);break;
      default: canvas.drawRoundRect(5,8,27,24,4,4,paint);line(canvas,14,12,21,16,14,20,14,12);break;
    }
    if(selected){paint.setStyle(Paint.Style.FILL);canvas.drawCircle(16,29,1,paint);}
    canvas.restore();
  }
  @Override public void setAlpha(int alpha) { paint.setAlpha(alpha); }
  @Override public void setColorFilter(@Nullable ColorFilter filter) { paint.setColorFilter(filter); }
  @Override public int getOpacity() { return PixelFormat.TRANSLUCENT; }
  @Override public int getIntrinsicWidth() { return 32; }
  @Override public int getIntrinsicHeight() { return 32; }
}
