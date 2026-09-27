# PlayersHype Android Ecosystem V1
Two independent Preview apps: PlayersHype public and PlayersHype Admin. Both retain the proven Gradle8.13 / AGP8.11.1 / API36 / WebKit pipeline and hardened WebViews.

The supplied original HypePredict assets are integrated into each app. The public app opens Track Hub internally and reads a sanitized offline cache. Admin retains its original HUB and adds validated local configuration drafts. Core authentication, publishing and rollback remain blocked until the existing backend and identity provider are supplied; no fake publish success is implemented.

See [architecture](docs/ARCHITECTURE.md), [migration audit](docs/MIGRATION_AUDIT.md), [build](docs/BUILD_ANDROID.md), [security](docs/SECURITY_MODEL.md), [Core requirements](docs/PLAYERSHYPE_CORE_API.md) and [release limitations](docs/RELEASE_NOTES.md).

GitHub Actions produces PlayersHype-App-V1-PREVIEW.apk and PlayersHype-Admin-V1-PREVIEW.apk, SHA-256 files, signature/metadata evidence and three master archives. These are QA builds, not production releases. Device installation and complete feature parity require separate verification.
