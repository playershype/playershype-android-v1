# HypePredict Postmortem — Historical Archive V1 (implementation contract)
Status: SPECIFIED, NOT DEPLOYED. Owner: PlayersHype. 2026-10-07.

## Non-negotiable
Keep existing HUB/Admin UI and branch v0.1-stitch-clean. Do not modify main or resurrect V1.3.x.
Postmortem is the single source of historical performance. Historical ingestion does NOT require re-uploading full original analyses. Public archive launches with verified records only.

## Data contract
- track_id, race_date (track-local), race_number, race_id unique(track_id,race_date,race_number)
- predictions: select_number, rival_number, tapada_number, huevazo_number, other_original_picks, model_version, original_publication_url, original_publication_timestamp, original_snapshot_hash, original_snapshot_location
- results: official_winner_number, official_result_url, result_verified_at, scratched_numbers, race_status, dividends
- evaluation: select_hit, rival_hit, top3_hit, pace_assessment, error_analysis, notes, rules_version
- audit: created_at, updated_at, created_by, reviewed_by, reviewed_at, approved_at, published_at, source_quality, revision, supersedes_revision
- lifecycle: draft -> under_review -> approved -> published; corrections produce new revisions with public correction history; withdrawn records excluded from metrics but retain audit trail.
- historical evidence quality: verified_pre_race | partial | insufficient. Only verified_pre_race can enter certified hit-rate metrics. Do not silently exclude actual losing certified picks.

## Enforcement (server-side, not CSS)
- Public read policy: published AND source_quality=verified_pre_race AND result_verified_at IS NOT NULL AND approved_at IS NOT NULL.
- Drafts/partial records accessible only to authenticated authorized Admin users.
- Unique race key; immutable original forecast snapshot/hash and timestamp after approval; corrections require a new revision and reason.
- Approval checks: dated pre-race evidence, official result, valid runner numbers, scratches, race completion, scoring rules, duplicate detection.
- No client-provided accuracy percentages; compute on server from eligible race rows. Published aggregate queries use same eligibility policy as race-detail pages.
- Backup independent of GitHub Pages; database migrations and object storage with versioning; never store privileged database keys in browser or Android APK.

## Admin workflow
Create/edit one race OR whole card; save draft persistently; reopen; attach source URL and snapshot; verify official results; approve; publish. Support retraction/correction and batch import. Do not require entire original analysis body.

## Public workflow
Global metrics; track-specific metrics; date filter; race-detail showing original selection, dated source evidence, official result, hit/miss and explanation, revision history, methodology, denominator and last refresh time.
If no certified races exist, show honest empty state, not zero accuracy or fabricated metrics.

## Acceptance gates
1. Save draft, close Admin, reopen: unchanged.
2. Two inserts of same race: exactly one canonical race.
3. Missing pre-race evidence: cannot publish as certified.
4. Missing official result: cannot publish.
5. Wrong scratch/winner: validation blocks approval.
6. Publish one verified race: public detail and aggregates update together.
7. Draft/partial/withdrawn race never appears in public stats.
8. Correct a published race: previous revision preserved, totals recomputed, correction visible.
9. Public anonymous user cannot write or access unpublished records.
10. Export/import backup restores all records and audit history.
11. Verify on Android device AND public web URL; green CI alone does not satisfy acceptance.

## Integration prerequisite
Locate the CURRENT working Admin/HUB implementation and persistence backend first. The branch contains older workflow references to V1.3.1, so do not wire the archive to that legacy build. Identify active deploy entry points, auth and backend before implementing migrations or UI. This file is an implementation contract, not a claim of working functionality.
