# Automation Studio — Test Plan

Covers every automation in [`../../automation-studio/README.md`](../../automation-studio/README.md).
Each automation is tested for: correct output on valid input, graceful handling of empty/edge-case
input, and correct error-handling behavior (halt + log + notify) on a forced failure.

## 1. Nightly-Contact-Hygiene

| Test ID | Scenario | Expected Result |
|---|---|---|
| AT-01 | Subscriber present on `Shared_GlobalSuppressionList` with matching email | `SubscriberStatus`/`EmailOptIn` updated per `01-apply-global-suppression.sql` |
| AT-02 | Subscriber with an `_Open` event since last engagement date | `LastEngagementDate` refreshed by `02-refresh-engagement-dates.sql` |
| AT-03 | `ShopStyle_Preferences` row whose parent Subscriber was deleted by native retention policy | Removed by `09-cascade-delete-orphans.sql` on next run |
| AT-04 | Order older than 1095 days | Staged to `ShopStyle_Orders_Archive` by `10-archive-aged-orders.sql`, then exported and truncated |
| AT-05 | Forced SQL Activity failure (malformed step injected in QA) | Automation halts, does not run subsequent steps, `Automation_ErrorLog` row written, `data-eng@shopstyleretail.com` notified |

## 2. Abandoned-Cart-Detection

| Test ID | Scenario | Expected Result |
|---|---|---|
| AT-06 | Cart with `CartLastUpdatedDate` exactly 30 minutes ago, `CartStatus=Active` | Flipped to `Abandoned` on next 15-min run |
| AT-07 | Cart abandoned 14+ days | Flipped to `Expired`, no longer a journey-entry candidate |
| AT-08 | Subscriber `EmailOptIn=0` with an otherwise-qualifying cart | Excluded from abandonment flip (no point flagging a cart for a suppressed contact) |

## 3. Loyalty-Tier-and-Birthday-Nightly

| Test ID | Scenario | Expected Result |
|---|---|---|
| AT-09 | Subscriber with no prior `ShopStyle_Loyalty` row but qualifying orders | New row inserted with correct tier |
| AT-10 | Subscriber's birthday today, already logged this calendar year | Not re-entered (see `Birthday_Journey_Log` dedup) |

## 4. Winback-Inactive-Detection / Sunset-Enforcement

| Test ID | Scenario | Expected Result |
|---|---|---|
| AT-11 | Subscriber inactive exactly 90 days | Staged `Tier1_90Day`, journey-entry eligible |
| AT-12 | Subscriber flagged for sunset, re-engages before the sunset automation runs | Not sunset (fresh engagement check at run time, not flag time) |

## 5. Product-Catalog-Nightly-ETL (full pipeline)

| Test ID | Scenario | Expected Result |
|---|---|---|
| AT-13 | Well-formed nightly feed file | Import → validate → promote succeeds; `Shared_ProductCatalog` reflects new/updated/discontinued SKUs |
| AT-14 | Feed file with a row missing `Price` | Row rejected and logged to `Automation_ErrorLog` (Warning), valid rows still promoted |
| AT-15 | Feed file is empty/truncated (simulated transfer failure) | `validate-catalog-row-count.ssjs` detects the >20% row-count collapse and halts the pipeline with a Critical log entry — catalog is NOT silently overwritten with bad data |
| AT-16 | SKU present in yesterday's feed, absent from today's | Soft-deleted (`InStock=0, InventoryCount=0`), not hard-deleted (preserves historical `OrderLineItems` joins) |

## 6. Reporting-Nightly-Refresh

| Test ID | Scenario | Expected Result |
|---|---|---|
| AT-17 | Normal daily send volume | `Reporting_CampaignPerformance`, `Reporting_DeliverabilitySummary`, `Reporting_EngagementScoreDistribution` all refresh |
| AT-18 | Bounce rate exceeds 2% guardrail for the day | `Reporting_DeliverabilitySummary.GuardrailStatus='BREACH'`, `alert-automation.js` sweep pages Automation Operator |

## Error-Handling Cross-Cutting Tests

| Test ID | Scenario | Expected Result |
|---|---|---|
| AT-19 | Any Script Activity throws | Caught, logged via `ssjs/shared/error-logger.ssjs` pattern to `Automation_ErrorLog`, re-thrown so the automation halts (not silently swallowed) |
| AT-20 | Transient failure (simulated network blip) on a Script Activity's REST call | Retried per the activity's own retry logic (e.g., `fire-fallback-events.ssjs` HttpRequest `retries=2`) before being treated as a hard failure |

## Sign-off Checklist

- [ ] All automation-specific tests (AT-01 through AT-18) pass in QA sandbox
- [ ] Error-handling cross-cutting tests (AT-19, AT-20) verified for at least 3 representative automations
- [ ] Data integrity checks ([`../sql-validation/`](../sql-validation/)) run clean after a full nightly cycle
- [ ] Deployment checklist item automation activation order followed (see [`../../deployment/checklist.md`](../../deployment/checklist.md))
