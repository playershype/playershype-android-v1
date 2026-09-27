# Architecture
app-user (com.playershype.app.preview) and app-admin (com.playershype.admin.preview) are independent applications. shared supplies the hardened shell, bounded file mediator, public projection and atomic feed cache. AndroidX WebKit loads only packaged executable assets from https://appassets.androidplatform.net.

The native bottom bar retains Home and HypePredict WebViews while switching tabs. Public Predict routes into the original template. Public route/card/race state persists; full process-death restoration of open overlays is not implemented. Admin uses the original HUB plus a local Control Center.

Current data path: published legacy Track Hub HTML -> extract JSON only -> allowlist projection -> schema validation -> merge 30-day history -> atomic private cache -> public UI. No downloaded HTML/JavaScript executes. This is a transitional adapter, not a verified PlayersHype Core deployment.

Target path: authenticated Admin -> existing Core -> versioned sanitized publication -> public app. No shared APK storage, cross-app content provider, permanent bearer, or fabricated publish endpoint is introduced.
