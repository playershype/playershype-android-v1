# Core integration — BLOCKED
The existing Results and Live Worker roots were reachable during the audit. That does not establish the requested Core contract or authorize creating a second backend. No new backend was deployed.

Required inputs: repository/location of the existing Core Worker, public API base URL, OIDC issuer/client configuration (public client, no embedded client secret), allowed redirect URI, server roles and test environment. Never paste bearer tokens or signing secrets into chat/source.

Proposed contract for review with that existing service (not claimed deployed):
- GET /api/public/manifest: schemaVersion, revision, content hash, publication date, public app configuration and public card references.
- GET /api/public/cards/{id}: sanitized schema-v1 card.
- Authenticated draft validation/preview/publish: server role check, immutable revision, expected prior revision, compatibility validation and public projection performed server-side.
- Authenticated rollback: select a prior publication, create a new audited publication referencing it; never silently rewrite sealed analyses.

Require short-lived scoped access tokens, Android Keystore protection, server-side authorization, refresh/revocation policy and concurrency conflicts. Enabling buttons or a local validation result does not prove these properties. No authenticated publish/rollback integration test can pass before those inputs exist.
