# Security model
Both APKs retain HTTPS-only navigation, blocked cleartext, disabled WebView debugging/file/content access, blocked mixed content, SSL cancel, Safe Browsing back-to-safety, disabled backup and data extraction, no addJavascriptInterface and system-browser external HTTPS links. Packaged scripts use self-only CSP without unsafe-eval; styles remain inline-compatible for the original renderer.

AndroidX WebMessageListener is restricted to the exact packaged origin and main frame. Actions are allowlisted: bounded export chunks, explicit Android file picker for Admin, safe HTTPS external links and public read-only sync. Unknown actions fail. No arbitrary native invocation or remote-script loading is offered. Content URIs are only used by native Storage Access Framework code, never enabled in WebView. Sharing grants temporary read access through a non-exported FileProvider scoped to cache/exports.

Public projection and separate packages reduce private-data exposure. Admin ships tools, not embedded private workspace. QA keys never enter source/artifacts. Stable QA secrets are optional; fallback keys are ephemeral and are not production signing.

Current limits: static security audit and unit/DOM tests do not establish complete penetration testing or device runtime behavior. Auth/Keystore/session/server authorization remain blocked and must precede enabling publishing.
