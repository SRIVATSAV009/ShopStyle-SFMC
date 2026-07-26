# SQL Validation

[`data-extension-integrity-checks.sql`](data-extension-integrity-checks.sql) — 8 zero-rows-expected
checks covering referential integrity (orphaned children, unknown SKU references), suppression
consistency, duplicate primary keys, loyalty tier/spend consistency, and consent log sanity.

## When to Run

- After any bulk import (`deploy-data-extensions.js`, nightly ETL — see [`../../automation-studio/README.md`](../../automation-studio/README.md))
- Before activating a journey in Production for the first time
- As part of the [deployment checklist](../../deployment/checklist.md) pre-deployment gate
- On a recurring schedule (weekly) as a standing data-quality automation

## Interpreting Results

Every query is written to return **zero rows on a healthy system**. Any returned row is a named,
actionable defect — the `CheckName` column identifies which check fired so it can be triaged directly
against the automation/journey most likely responsible (e.g., "Loyalty tier does not match spend
bracket" points at `automation-studio/sql/14-recalculate-loyalty-tiers.sql` having failed or drifted).

## Automating the Gate

Wire this file into `automation-studio/config/reporting-refresh-automation.json` as an additional SQL
Query Activity that writes results to a `DataIntegrity_CheckResults` DE, then have
`deliverability/monitors/alert-automation.js` page on any non-empty result set — the same pattern
already used for deliverability guardrail breaches.
