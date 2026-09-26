# PlayersHype Android V1 — Preview

Pipeline: Gradle 8.13, Android Gradle Plugin 8.11.1, Java 17,
compileSdk / targetSdk 36 and AndroidX WebKit 1.14.0.

## Verification and build

Run `python scripts/security_audit.py`, then
`./gradlew testDebugUnitTest testPreviewUnitTest lintPreview --no-daemon`.
GitHub Actions performs these checks before `assemblePreview`.

Preview signing uses a temporary QA-only RSA key created in the runner's
private temporary directory. The key and random passwords are never committed
or uploaded. The final step removes the key. Each run has a different signing
identity, so uninstall an older Preview before installing a new run's APK.
Production signing is not configured.

For a local Preview build, provide PREVIEW_KEYSTORE, PREVIEW_STORE_PASSWORD and
PREVIEW_KEY_PASSWORD through the environment, using key alias `preview`.
Never put signing credentials in source files.

On Windows, after the verification commands pass, set JAVA_HOME and ANDROID_HOME
and run `./scripts/build_preview.ps1`. This creates and deletes a temporary QA
key automatically and writes the APK, SHA-256 and signature evidence to `artifacts/`.

## Artifacts

GitHub Actions artifact `PlayersHype-App-V1-Android` contains:
- PlayersHype-App-V1-PREVIEW.apk
- PlayersHype-App-V1-PREVIEW.apk.sha256
- signature-verification.txt
- apk-metadata.txt
- BUILD_COMMIT.txt

Test and lint reports are uploaded as `PlayersHype-verification`.

The WebView renders packaged assets, blocks cleartext/file/content access and
mixed content, has debugging and native JavaScript bridges disabled, cancels
SSL errors and enables Safe Browsing. External HTTPS navigation uses the system
browser. Backup and data extraction remain disabled.

This is a sideload Preview, not a production release. Live product updates and
all device flows still require testing on Android.
