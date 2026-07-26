# Automation Studio — ETL & Operations

All ShopStyle automations follow the same conventions so any engineer can reason about any automation
without re-learning patterns per-job.

## Automation Inventory

| Automation | Schedule | Purpose | Config |
|---|---|---|---|
| Nightly-Contact-Hygiene | Daily 01:00 | Suppression, engagement refresh, orphan cascade, order archival | [`config/nightly-retention-automation.json`](config/nightly-retention-automation.json) |
| IP-Warmup-Ramp-Controller | Daily 06:00 | Enforces IP warm-up send caps | [`config/ip-warmup-automation.json`](config/ip-warmup-automation.json) |
| Abandoned-Cart-Detection | Every 15 min | Flips stale carts to Abandoned/Expired | [`sql/11-detect-abandoned-carts.sql`](sql/11-detect-abandoned-carts.sql) |
| Discount-Pool-Replenishment | Daily 03:00 | Promotes imported codes, purges expired | [`sql/12-replenish-discount-pool.sql`](sql/12-replenish-discount-pool.sql) |
| Order-Status-Timeout-Fallback | Hourly | Missed-webhook safety net for shipping/delivery events | [`sql/13-order-status-timeout-fallback.sql`](sql/13-order-status-timeout-fallback.sql) |
| Loyalty-Tier-and-Birthday-Nightly | Daily 04:00 | Tier recalculation + birthday journey-entry detection | [`config/loyalty-birthday-automation.json`](config/loyalty-birthday-automation.json) |
| Winback-Inactive-Detection | Weekly Mon 05:30 | 90/180/270-day inactivity tiering | [`sql/16-detect-inactive-subscribers.sql`](sql/16-detect-inactive-subscribers.sql) |
| Winback-Sunset-Enforcement | Weekly Mon 07:00 | Enforces sunset policy | [`sql/17-sunset-inactive-subscribers.sql`](sql/17-sunset-inactive-subscribers.sql) |
| Product-Catalog-Nightly-ETL | Daily 00:30 | Full import→validate→promote→extract→export pipeline | [`config/product-catalog-etl-automation.json`](config/product-catalog-etl-automation.json) |

## Activity Types Used (complete coverage)

| Activity Type | Example |
|---|---|
| Import | `product-catalog-etl-automation.json` step 2 — CSV → `Staging_ProductCatalogImport` |
| Export / Data Extract | `product-catalog-etl-automation.json` step 5 — anonymized order snapshot |
| SQL Query | Every automation in this table uses at least one |
| Script (SSJS) | [`script-activities/validate-catalog-row-count.ssjs`](script-activities/validate-catalog-row-count.ssjs), [`../ssjs/automation/fire-fallback-events.ssjs`](../ssjs/automation/fire-fallback-events.ssjs) |
| File Transfer (inbound) | [`file-transfer/import-product-catalog.json`](file-transfer/import-product-catalog.json), [`file-transfer/import-discount-codes.json`](file-transfer/import-discount-codes.json) |
| File Transfer (outbound) | [`file-transfer/export-order-archive.json`](file-transfer/export-order-archive.json), [`file-transfer/export-anonymized-orders.json`](file-transfer/export-anonymized-orders.json) |
| Encryption / Decryption | PGP on every File Transfer activity above — see [`../docs/security-guide.md`](../docs/security-guide.md#pgp-key-management) |

## Scheduling Conventions

- All schedules are `America/New_York` (Parent BU home timezone) regardless of Child BU, to keep
  cross-BU automation sequencing predictable; Child-BU-facing content (e.g., send times) accounts for
  local timezone separately where relevant (e.g., Einstein STO, see [`../einstein/`](../einstein/)).
- High-frequency operational automations (abandonment detection, webhook fallback) run every
  15 minutes / hourly; data-hygiene and reporting automations run nightly; program-level detection
  (birthday, winback) runs daily/weekly, matching how often the underlying condition can realistically
  change.

## Logging & Error Handling

Every automation follows the same error-handling contract:

1. **`onActivityFailure: HaltAutomationAndNotify`** — a failed activity does not let downstream
   activities run against incomplete/invalid data.
2. **Retry policy** — transient failures (network, momentary lock contention) get 2 retries with a
   backoff delay before being treated as a hard failure.
3. **Centralized logging** — all Script Activities include
   [`../ssjs/shared/error-logger.ssjs`](../ssjs/shared/error-logger.ssjs) and write to
   `Automation_ErrorLog` rather than only using `Write()` console output, so failures are queryable
   and feed [`../deliverability/monitors/alert-automation.js`](../deliverability/monitors/alert-automation.js).
4. **Anomaly detection, not just failure detection** — e.g.,
   [`script-activities/validate-catalog-row-count.ssjs`](script-activities/validate-catalog-row-count.ssjs)
   treats a suspicious *successful-but-wrong* import (a >20% row-count collapse) as a failure condition,
   not just literal activity errors.

See [`../docs/runbook.md`](../docs/runbook.md) for on-call response procedures when an automation fails.
