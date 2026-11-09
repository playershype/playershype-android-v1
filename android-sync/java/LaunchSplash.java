package com.playershype.shared;

import android.animation.ValueAnimator;
import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.io.InputStream;

/** Local user-app branding overlay. Home starts normally underneath it. */
public final class LaunchSplash extends FrameLayout {
  private static final LaunchGate GATE = new LaunchGate();
  private final Handler main = new Handler(Looper.getMainLooper());
  private final View content;
  private final int previousAccessibility;
  private final View previousFocus;
  private final boolean motion;
  private final Runnable finish = this::dismiss;
  private final Runnable fade = () -> animate().alpha(0f).setDuration(LaunchGate.FADE_MS).start();
  private boolean dismissed;

  public static void attach(Activity activity, FrameLayout stage, View content, boolean restored) {
    if (!GATE.claim(false, restored)) return;
    long started = SystemClock.uptimeMillis();
    LaunchSplash splash = new LaunchSplash(activity, content);
    stage.addView(splash, new FrameLayout.LayoutParams(-1, -1));
    splash.requestFocus();
    splash.schedule(started);
  }

  private LaunchSplash(Activity activity, View content) {
    super(activity);
    this.content = content;
    previousAccessibility = content.getImportantForAccessibility();
    previousFocus = content.findFocus();
    content.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
    motion = ValueAnimator.areAnimatorsEnabled(); // minSdk 26
    setBackground(new GradientDrawable(GradientDrawable.Orientation.TL_BR,
        new int[]{Color.rgb(10,25,47), Color.rgb(12,37,62), Color.rgb(8,13,24)}));
    setClickable(true);
    setFocusable(true);
    setFocusableInTouchMode(true);
    setContentDescription("PlayersHype. Definiendo el estándar.");
    setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_YES);

    LinearLayout brand = new LinearLayout(activity);
    brand.setOrientation(LinearLayout.VERTICAL);
    brand.setGravity(Gravity.CENTER);
    FrameLayout.LayoutParams centered = new FrameLayout.LayoutParams(-1, -2, Gravity.CENTER);
    centered.setMargins(dp(28),0,dp(28),0);
    addView(brand, centered);

    TextView kicker = text(activity, "LA MANADA", 11, Color.rgb(100,255,218));
    kicker.setLetterSpacing(.2f);
    brand.addView(kicker, new LinearLayout.LayoutParams(-2,-2));

    ImageView logo = new ImageView(activity);
    logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
    logo.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
    Bitmap bitmap = null;
    try (InputStream in = activity.getAssets().open("branding/playershype-wordmark.webp")) {
      bitmap = BitmapFactory.decodeStream(in);
    } catch (Exception ignored) { /* Local fallback below; launch remains bounded. */ }
    if (bitmap != null) {
      logo.setImageBitmap(bitmap);
      LinearLayout.LayoutParams size = new LinearLayout.LayoutParams(dp(250),dp(150));
      size.topMargin=dp(26);brand.addView(logo,size);
    } else {
      TextView fallback = text(activity,"PLAYERSHYPE",34,Color.WHITE);
      LinearLayout.LayoutParams size = new LinearLayout.LayoutParams(-2,-2);
      size.topMargin=dp(26);brand.addView(fallback,size);
    }

    View accent = new View(activity);
    accent.setBackgroundColor(Color.rgb(100,255,218));
    LinearLayout.LayoutParams line = new LinearLayout.LayoutParams(dp(62),dp(2));
    line.topMargin=dp(30);line.bottomMargin=dp(20);brand.addView(accent,line);
    TextView tagline = text(activity,"Definiendo el estándar.",18,Color.rgb(224,251,252));
    brand.addView(tagline,new LinearLayout.LayoutParams(-2,-2));

    if (motion) {
      if(bitmap!=null){logo.setAlpha(0f);logo.setScaleX(.94f);logo.setScaleY(.94f);
      logo.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(380).start();}
      tagline.setAlpha(0f);tagline.animate().alpha(1f).setStartDelay(180).setDuration(350).start();
      accent.setScaleX(.1f);accent.animate().scaleX(1f).setDuration(800).start();
    }
  }

  private void schedule(long started) {
    if (motion) main.postDelayed(fade, Math.max(0,LaunchGate.remaining(started,SystemClock.uptimeMillis())-LaunchGate.FADE_MS));
    // Removal uses uptime, not Animator completion or network readiness; animation scale cannot extend it.
    main.postDelayed(finish,LaunchGate.remaining(started,SystemClock.uptimeMillis()));
  }

  private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
  private TextView text(Activity a,String value,int size,int color){
    TextView v=new TextView(a);v.setText(value);v.setTextSize(size);v.setTextColor(color);
    v.setGravity(Gravity.CENTER);v.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));return v;
  }
  private void dismiss(){
    if(dismissed)return;dismissed=true;
    main.removeCallbacks(fade);main.removeCallbacks(finish);cancelMotion(this);
    content.setImportantForAccessibility(previousAccessibility);
    if(getParent() instanceof ViewGroup)((ViewGroup)getParent()).removeView(this);
    if(previousFocus!=null&&previousFocus.isAttachedToWindow())previousFocus.requestFocus();else content.requestFocus();
  }
  private void cancelMotion(View view){view.animate().cancel();if(view instanceof ViewGroup){ViewGroup group=(ViewGroup)view;for(int i=0;i<group.getChildCount();i++)cancelMotion(group.getChildAt(i));}}
  @Override protected void onDetachedFromWindow(){
    main.removeCallbacks(fade);main.removeCallbacks(finish);cancelMotion(this);
    content.setImportantForAccessibility(previousAccessibility);super.onDetachedFromWindow();
  }
}
