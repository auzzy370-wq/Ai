# Challenge Integrity Engine

Internal quality gate for Crucible’s problem library.

## What it checks

| Detector | Code | Severity |
|----------|------|----------|
| Starter/harness bound to challenge slug | `MISSING_STARTER`, `FAMILY_UNBOUND`, `FAMILY_MISMATCH`, `PACKAGE_SLUG_MISMATCH` | error |
| Statement API vs test imports | `EXPORT_IMPORT_MISMATCH`, `STATEMENT_API_MISMATCH` | error/warn |
| Reference solution quality | `REFERENCE_STUB`, `REFERENCE_MISSING`, `STARTER_LOOKS_SOLVED` | error/warn/info |
| Duplicate / contradictory cases | `DUPLICATE_TEST_NAME`, `CONTRADICTORY_EXPECTATIONS`, `NO_PUBLIC_TESTS` | error |
| Unrealistic difficulty (live acceptance) | `UNREALISTIC_DIFFICULTY`, `RESOURCE_MISMATCH` | warning |
| Missing edge coverage | `MISSING_EDGE_CASE` | warning |
| Hidden-test leakage | `HIDDEN_NAME_IN_PUBLIC`, `HIDDEN_FIXTURE_LEAK` | error/warn |
| Nondeterministic harness | `NONDETERMINISTIC_HARNESS` | error |
| Content version drift | `VERSION_DRIFT` | warning |

Each scan stamps `contentVersion` (hash of statement + requirements + harness) and stores a `ChallengeIntegrityReport`.

## Publish policy

- `PATCH /api/admin/library` with `isPublished: true` **runs the engine first**.
- Status `fail` → **HTTP 409 `INTEGRITY_BLOCK`** (unless `force: true`, which is audited).
- `POST /api/admin/challenge-integrity` `{ "action": "publish", "challengeId": "…" }` is the explicit gated publish path.

## Calibration

When ≥10 live `hidden_test` jobs exist, the engine computes acceptance % and suggests `calibratedDifficulty` (1–10). Large gaps vs labeled difficulty raise `UNREALISTIC_DIFFICULTY`.

## How to run

```bash
# CLI batch
npx tsx scripts/challenge-integrity.ts --take 120
npx tsx scripts/challenge-integrity.ts --slug lc-two-sum

# Admin UI → Integrity tab → “Scan library”
# or Library row → Scan / Publish
```

## APIs

- `GET /api/admin/challenge-integrity` — summary + worst offenders
- `GET /api/admin/challenge-integrity?slug=…` — latest report for one challenge
- `POST /api/admin/challenge-integrity` — `scan` | `scan_library` | `publish`
