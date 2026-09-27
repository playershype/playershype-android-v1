# Build
Pinned pipeline: Gradle8.13, Android Gradle Plugin8.11.1, Java17, compile/target API36, build-tools36.0.0, min API26, AndroidX WebKit1.14.0.

Run python scripts/security_audit.py first. Install locked test dependencies with pnpm --dir scripts/ui-tests install --frozen-lockfile --ignore-scripts; run node scripts/ui-tests/test.cjs. Run Gradle :shared:testDebugUnitTest :app-user:testDebugUnitTest :app-user:testPreviewUnitTest :app-admin:testPreviewUnitTest :app-user:lintPreview :app-admin:lintPreview before assembling both preview variants.

Set PREVIEW_KEYSTORE, PREVIEW_STORE_PASSWORD, PREVIEW_KEY_PASSWORD and optional PREVIEW_KEY_ALIAS for a QA key only. Never put them in tracked gradle.properties. scripts/build_preview.ps1 can generate a disposable local key. CI optionally consumes the four QA secrets documented in DEPLOYMENT.md; partial secret configuration fails.

CI verifies signatures with apksigner, checks non-debuggable metadata, creates hashes and packages source/docs/reports. APK package IDs end in .preview. Version1.1.0-preview/code2.

The emulator CI job installs both signed artifacts on API36, launches them and checks internal HypePredict navigation through the Android UI hierarchy. Its separate evidence artifact contains screenshots, UI trees and process logs. A successful emulator smoke run does not establish full device parity.
