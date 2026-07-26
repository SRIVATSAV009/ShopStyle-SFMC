# Birthday / Loyalty Journey — Test Plan

Journey under test: [`journeys/birthday-loyalty/birthday-journey.json`](../../journeys/birthday-loyalty/birthday-journey.json)

## 1. Loyalty Tier Calculation Tests

| Test ID | Scenario | Expected Result |
|---|---|---|
| BL-01 | Subscriber with $0 orders in trailing 12 months | `CurrentTier = Bronze`, `PointsToNextTier = 500` |
| BL-02 | Subscriber with $2,400 trailing spend | `CurrentTier = Gold`, `PointsToNextTier = 2600` |
| BL-03 | Subscriber crosses from Silver to Gold this run | `TierEffectiveDate` updates to today; `TierExpirationDate` = today + 12mo |
| BL-04 | Subscriber with qualifying order but no existing `ShopStyle_Loyalty` row | New row inserted with correct tier |
| BL-05 | Order with `OrderStatus = 'Returned'` | Excluded from trailing-spend sum |

## 2. Birthday Detection Tests

| Test ID | Scenario | Expected Result |
|---|---|---|
| BL-06 | Subscriber's birthday is today, not yet logged this year | Row inserted into `Birthday_Journey_Entry` and `Birthday_Journey_Log` |
| BL-07 | Automation re-runs same day (retry after transient failure) | No duplicate entry (join against `Birthday_Journey_Log` for current year prevents re-insert) |
| BL-08 | Subscriber `EmailOptIn = 0` | Excluded from `Birthday_Journey_Entry` |
| BL-09 | Subscriber with `DateOfBirth IS NULL` | Excluded |

## 3. Random Split A/B Test

| Test ID | Scenario | Expected Result |
|---|---|---|
| BL-10 | 1,000 simulated entrants | Roughly 50/50 split between Variant A and B (statistical tolerance ±3% at this volume) |
| BL-11 | Variant A entrant | `ShopStyle_ABTestResults` row logged with `Variant='A'` **before** email send; Email Variant A rendered with flat `BDAY20` code |
| BL-12 | Variant B entrant, tier=Gold | Email renders "25% off + free gift wrapping" copy and `BDAYGOLD25` code |
| BL-13 | Variant B entrant, tier=Bronze (no loyalty row / default) | Falls back to Bronze copy/code, does not error |

## 4. Reporting Validation

- Run [`../../sql/reporting/ab-test-results.sql`](../../sql/reporting/ab-test-results.sql) against QA
  sandbox seed data; confirm Sent/Opens/Clicks/Conversions counts match manually-tallied seed data
  exactly, and `AttributedRevenue` only counts orders within the 14-day attribution window.

## Sign-off Checklist

- [ ] BL-01–BL-05 loyalty tier tests pass
- [ ] BL-06–BL-09 birthday detection tests pass
- [ ] BL-10–BL-13 A/B split and rendering tests pass
- [ ] Reporting query validated against known seed data
- [ ] Deployment checklist item `journeys.birthday-loyalty` marked complete
