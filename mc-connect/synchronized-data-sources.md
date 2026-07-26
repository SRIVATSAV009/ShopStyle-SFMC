# Marketing Cloud Connect — Synchronized Data Sources

Marketing Cloud Connect creates and maintains **Synchronized Data Extensions** in each Child BU,
refreshed on a rolling schedule by the MC Connect background sync process (not a custom automation —
this is native MC Connect behavior, configured in Sales Cloud's Marketing Cloud Connect setup pages).

## Synchronized Objects

| Salesforce Object | Synchronized DE | Refresh Cadence | Fields Synced |
|---|---|---|---|
| `Contact` | `_SFContact` | Every 15 minutes | Id, Email, FirstName, LastName, MailingStreet/City/State/PostalCode/Country, Phone, `ShopStyle_Loyalty_Tier__c`, `DoNotMarket__c` |
| `Lead` | `_SFLead` | Every 15 minutes | Id, Email, FirstName, LastName, Status, LeadSource, Company |
| `Opportunity` | `_SFOpportunity` | Hourly | Id, ContactId (via custom lookup), Amount, StageName, CloseDate |
| `Case` | `_SFCase` | Every 15 minutes | Id, ContactId, Status, Priority, Subject, `Escalated__c` |

## Relationship to the Custom Data Model

The custom `ShopStyle_Subscribers` model (see [`../architecture/data-model.md`](../architecture/data-model.md))
is **not** replaced by `_SFContact` — they serve different purposes:

- `_SFContact` is the read-only, MC-Connect-managed mirror of Sales Cloud CRM data (service history,
  sales pipeline, case status) used for **segmentation context** (e.g., "exclude anyone with an open
  escalated case from promotional sends").
- `ShopStyle_Subscribers` is the marketing-owned, high-write-volume operational record (cart activity,
  order history, journey state) that would be impractical and risky to model directly in Sales Cloud
  given the write volume from real-time commerce events.

The two are joined via `Shared_CustomerIdentityBridge` (Salesforce `Contact.Id` ↔
`ShopStyle_Subscribers.SubscriberKey`), populated by
[`../automation-studio/sql/20-sync-identity-bridge.sql`](../automation-studio/sql/20-sync-identity-bridge.sql).

## Suppression from CRM Signals

[`../automation-studio/sql/21-crm-suppression-sync.sql`](../automation-studio/sql/21-crm-suppression-sync.sql)
runs nightly, reading `_SFContact.DoNotMarket__c` and open-escalated `_SFCase` records, and updates
`ShopStyle_Subscribers.SubscriberStatus` accordingly — ensuring a customer in an active support
escalation doesn't receive an unrelated promotional blast mid-incident.
