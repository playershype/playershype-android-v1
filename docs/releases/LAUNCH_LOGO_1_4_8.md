# PlayersHype 1.4.8 — visible launch logo

The supplied phone recording shows the launch text and streaks but no wordmark. The logo no longer begins with alpha zero or depends on an opacity animator completing. It stays opaque while translation and scale provide movement. A software-backed ARGB bitmap layer avoids relying on the transformed ImageView hardware layer. Decode failure falls back to the packaged launcher instead of an empty logo. This is a defensive fix; the recording alone does not identify a specific OEM rendering defect.

The 2.5-second full-screen entrance and Home handoff remain. No menus, network calls, permissions, new shipped libraries or data changes are added. The existing 13,850-byte logo asset is reused. Normal/resumed, reduced-motion and offline behavior remain part of device verification; the previously failing offline recovery check remains a separate limitation until it passes.

Version 1.4.8, code 16. Permanent signing and both package identities remain unchanged. CI now records 25 seconds from launch so cold-start overhead does not truncate the animation evidence.
