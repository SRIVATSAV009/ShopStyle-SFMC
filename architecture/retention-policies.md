# Data Retention Policies

Retention is enforced two ways: (1) native **Data Extension Data Retention Policy** settings (deployed
per-DE alongside schema — see `retentionPolicy` block in each `config/data-extensions/*.json`), and
(2) an explicit nightly **Automation Studio** job for cross-DE cascades that the native policy engine
cannot express (e.g., deleting orphaned child records).

## Policy Summary

| Data Extension | Policy | Rationale |
|---|---|---|
| `ShopStyle_Subscribers` | Delete 730 days after `LastEngagementDate` with no activity | Marketing-data minimization; aligns with CCPA/GDPR data-minimization principle |
| `ShopStyle_Preferences` | Cascades with parent | No independent lifecycle |
| `ShopStyle_Addresses` | Cascades with parent | No independent lifecycle |
| `ShopStyle_Orders` | Archive to cold storage then delete after 1095 days | Finance/tax records need 3-year availability; archived, not purged, for compliance |
| `ShopStyle_OrderLineItems` | Cascades with parent Order | No independent lifecycle |
| `ShopStyle_Loyalty` | No expiry (active program state) | Tier/points must persist for program duration |
| `ShopStyle_CartActivity` | Delete 14 days after creation | Operational/transient data, no long-term value once cart is stale |
| `ShopStyle_ConsentLog` | Retain 2555 days (7 years), never auto-purge | Legal evidentiary requirement for consent audits |
| `Shared_GlobalSuppressionList` | Retain indefinitely | Suppression must persist to prevent re-permission violations |
| `Shared_ProductCatalog` | Overwritten nightly, no history | Point-in-time feed, not historical data |

## Cascade & Archive Automation

- `automation-studio/sql/09-cascade-delete-orphans.sql` — runs nightly after the native retention
  policy sweep; deletes `ShopStyle_Preferences` / `ShopStyle_Addresses` / `ShopStyle_Loyalty` /
  `ShopStyle_CartActivity` rows whose parent `SubscriberKey` no longer exists in `ShopStyle_Subscribers`.
- `automation-studio/sql/10-archive-aged-orders.sql` — exports orders older than 1095 days to
  `sample-data/archive/orders/` (in production: SFTP-encrypted export to the enterprise data lake) before
  the native DE retention policy deletes them.
- Both are scheduled in [`automation-studio/config/nightly-retention-automation.json`](../automation-studio/config/nightly-retention-automation.json).

## Right-to-be-Forgotten (DSAR) Handling

A subject-access/erasure request is processed via
[`deployment/scripts/process-dsar-erasure.js`](../deployment/scripts/process-dsar-erasure.js), which:

1. Resolves the requestor's `SubscriberKey` (and any linked `UnifiedIndividualId` via the Identity
   Bridge) across all Child BUs.
2. Deletes/anonymizes rows across every DE in the relationship graph (`architecture/data-model.md`)
   **except** `ShopStyle_ConsentLog`, where the consent record is retained but the PII fields are
   scrubbed — the fact that consent was given/withdrawn is legally required to survive, the personal
   data attached to it is not.
3. Writes a completion record to `ShopStyle_ConsentLog` (`ConsentAction = "OptOut"`,
   `ConsentSource = "DSAR"`) for audit purposes.
4. Adds the email to `Shared_GlobalSuppressionList` with `SuppressionReason = "LegalOptOut"`.

See [`docs/security-guide.md`](../docs/security-guide.md#dsar) for the full procedure and SLAs.
