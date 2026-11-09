# PlayersHype 1.4.8 — visible launch logo

The supplied phone recording shows the launch text and streaks but no wordmark. The logo no longer begins with alpha zero or depends on an opacity animator completing. It stays opaque while translation and scale provide movement. A software-backed ARGB bitmap layer avoids relying on the transformed ImageView hardware layer. Decode failure falls back to the packaged launcher instead of an empty logo. This is a defensive fix; the recording alone does not identify a specific OEM rendering defect.

The 2.5-second full-screen entrance and Home handoff remain. No menus, network calls, permissions, new shipped libraries or data changes are added. The existing 13,850-byte logo asset is reused. Normal/resumed, reduced-motion and offline behavior remain part of device verification; the previously failing offline recovery check remains a separate limitation until it passes.

Version 1.4.8, code 16. Permanent signing and both package identities remain unchanged. CI now records 25 seconds from launch so cold-start overhead does not truncate the animation evidence.

## Follow-up 1.4.9, code 17

Animated emulator capture showed cold WebView initialization consuming the entrance budget before native brand frames were presented. Fresh user launch now constructs the Home WebView only after the native 2.5-second sequence. The brand stays opaque until that construction returns; saved-state restoration and the Admin retain immediate navigation. Back during the pre-WebView entrance exits safely. This trades concurrent Home construction for reliable presentation of the requested animation. Network data acquisition remains on the existing background executor.

## Android system splash handoff: 1.4.10, code 18

The native entrance clock now starts after the Android 12+ system splash exit callback removes the system overlay, using the platform SplashScreen API. Older Android versions start on the frame after first pre-draw. This prevents the 2.5-second budget from elapsing behind the system-owned starting window. Home construction remains deferred and the brand stays opaque. Reference: https://developer.android.com/develop/ui/views/launch/splash-screen
