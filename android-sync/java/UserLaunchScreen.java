package com.playershype.shared;

import android.animation.ValueAnimator;
import android.app.Activity;
import android.graphics.BitmapFactory;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import java.io.InputStream;

/** Local, finite brand entrance. No network, browser bridge, menu or replay controls. */
public final class UserLaunchScreen {
  private static final long DURATION_MS = 2500;
  private UserLaunchScreen() {}
  public static void show(Activity activity, View home, Runnable prepareHome) {
    FrameLayout stage = new FrameLayout(activity);
    stage.setBackgroundColor(Color.rgb(8,13,24));
    home.setVisibility(View.INVISIBLE);
    home.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
    stage.addView(home, new FrameLayout.LayoutParams(-1,-1));
    FrameLayout intro = new FrameLayout(activity);
    intro.setBackgroundColor(Color.rgb(8,13,24));
    intro.setContentDescription("PlayersHype. Definiendo el estándar.");
    intro.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_YES);
    stage.addView(intro, new FrameLayout.LayoutParams(-1,-1));
    activity.setContentView(stage);
    WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(activity.getWindow(),stage);
    bars.hide(WindowInsetsCompat.Type.systemBars());
    LinearLayout brand = new LinearLayout(activity);
    brand.setOrientation(LinearLayout.VERTICAL);
    brand.setGravity(Gravity.CENTER);
    int padding = dp(activity,24);
    brand.setPadding(padding,padding,padding,padding);
    FrameLayout.LayoutParams center = new FrameLayout.LayoutParams(-1,-2,Gravity.CENTER);
    intro.addView(brand,center);
    TextView kicker = text(activity,"LA MANADA",11,Color.rgb(100,255,218));
    kicker.setLetterSpacing(.30f);
    brand.addView(kicker);
    ImageView logo = new ImageView(activity);
    logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
    logo.setContentDescription("Logo PlayersHype");
    logo.setAlpha(1f);
    // Keep the bitmap on a software layer while the parent uses native effects.
    logo.setLayerType(View.LAYER_TYPE_SOFTWARE,null);
    try(InputStream in=activity.getAssets().open("launch-wordmark.webp")) {
      BitmapFactory.Options options=new BitmapFactory.Options();
      options.inPreferredConfig=Bitmap.Config.ARGB_8888;
      Bitmap bitmap=BitmapFactory.decodeStream(in,null,options);
      if(bitmap==null)throw new java.io.IOException("Invalid packaged wordmark");
      logo.setImageBitmap(bitmap);
    } catch(java.io.IOException e) {
      // A missing graphic must never prevent access to the Home.
      logo.setImageResource(activity.getApplicationInfo().icon);
      android.util.Log.w("PlayersHypeLaunch","Using packaged launcher fallback");
    }
    LinearLayout.LayoutParams logoBox = new LinearLayout.LayoutParams(-1,dp(activity,180));
    logoBox.topMargin=dp(activity,24);
    brand.addView(logo,logoBox);
    View accent = new View(activity);
    accent.setBackgroundColor(Color.rgb(0,180,216));
    LinearLayout.LayoutParams accentBox = new LinearLayout.LayoutParams(dp(activity,90),dp(activity,2));
    accentBox.topMargin=dp(activity,24); accentBox.bottomMargin=dp(activity,20);
    brand.addView(accent,accentBox);
    TextView phrase = text(activity,"Definiendo el estándar.",18,Color.rgb(224,251,252));
    brand.addView(phrase);
    Handler handler = new Handler(Looper.getMainLooper());
    Runnable finish = () -> {
      // Construct the Home WebView only after the brand has had its full screen time.
      prepareHome.run();
      home.setVisibility(View.VISIBLE);
      home.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_AUTO);
      stage.removeView(intro);
      bars.show(WindowInsetsCompat.Type.systemBars());
      if(ValueAnimator.areAnimatorsEnabled()) {
        home.setAlpha(.35f); home.setTranslationY(dp(activity,14));
        home.animate().alpha(1f).translationY(0).setStartDelay(0).setDuration(350).start();
      }
    };
    // Start only after the full-screen surface has dimensions and can be displayed.
    Runnable startIntro = () -> {
      if(!intro.isAttachedToWindow())return;
      handler.postDelayed(finish,DURATION_MS);
      if(!ValueAnimator.areAnimatorsEnabled())return;
      for(int i=0;i<6;i++) {
        View line=new View(activity);
        line.setBackgroundColor(Color.rgb(0,180,216));
        FrameLayout.LayoutParams lineBox=new FrameLayout.LayoutParams((int)(intro.getWidth()*.8),dp(activity,i==2?3:2));
        lineBox.topMargin=(int)(intro.getHeight()*(.24f+i*.115f));
        intro.addView(line,0,lineBox);
        line.setRotation(-14); line.setTranslationX(-intro.getWidth());
        line.animate().translationX(intro.getWidth()*1.4f).alpha(0).setStartDelay(i*35).setDuration(720).start();
      }
      // The logo must stay opaque even when an OEM skips or cancels animators.
      logo.setTranslationX(-dp(activity,24));logo.setScaleX(.94f);logo.setScaleY(.94f);
      logo.animate().translationX(0).scaleX(1).scaleY(1).setStartDelay(0).setDuration(650).setInterpolator(new DecelerateInterpolator(2)).start();
      kicker.setAlpha(0);kicker.setTranslationY(-dp(activity,15));
      kicker.animate().alpha(1).translationY(0).setStartDelay(700).setDuration(500).start();
      accent.setScaleX(0);accent.animate().scaleX(1).setStartDelay(800).setDuration(450).start();
      phrase.setAlpha(0);phrase.setTranslationY(dp(activity,18));
      phrase.animate().alpha(1).translationY(0).setStartDelay(1000).setDuration(550).start();
      // Keep the brand opaque until the Home is ready to take over.
    };
    // Do not spend the 2.5-second budget behind Android 12+'s system splash.
    if(android.os.Build.VERSION.SDK_INT>=31) {
      activity.getSplashScreen().setOnExitAnimationListener(systemSplash -> {
        systemSplash.remove();
        intro.postOnAnimation(startIntro);
      });
    } else {
      intro.getViewTreeObserver().addOnPreDrawListener(new android.view.ViewTreeObserver.OnPreDrawListener(){
        public boolean onPreDraw(){
          intro.getViewTreeObserver().removeOnPreDrawListener(this);
          intro.postOnAnimation(startIntro);
          return true;
        }
      });
    }
    intro.addOnAttachStateChangeListener(new View.OnAttachStateChangeListener(){
      public void onViewAttachedToWindow(View v){}
      public void onViewDetachedFromWindow(View v){handler.removeCallbacks(finish);intro.animate().cancel();}
    });
  }
  private static int dp(Activity activity,int value){return Math.round(value*activity.getResources().getDisplayMetrics().density);}
  private static TextView text(Activity activity,String value,int size,int color){
    TextView view=new TextView(activity);view.setText(value);view.setTextSize(size);view.setTextColor(color);view.setGravity(Gravity.CENTER);return view;
  }
}
