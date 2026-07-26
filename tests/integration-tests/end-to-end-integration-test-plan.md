# End-to-End Integration Test Plan

Cross-phase scenarios exercising the full customer lifecycle across multiple journeys, automations,
CloudPages, and integrations at once — the kind of defect that per-journey test plans (which test one
journey in isolation) can miss.

## IT-01: Full Lifecycle — Signup Through Loyalty Tier-Up

1. Submit the Smart Capture form ([`../../cloudpages/smart-capture/newsletter-signup.html`](../../cloudpages/smart-capture/newsletter-signup.html)).
2. Verify: `ShopStyle_Subscribers` row created, `ShopStyle_ConsentLog` OptIn logged,
   `APIEvent-Welcome-Signup` fired, Welcome Journey entered.
3. Simulate a purchase (insert `ShopStyle_Orders` + `ShopStyle_OrderLineItems`, fire
   `APIEvent-OrderPlaced`).
4. Verify: Welcome Journey's `DECISION-PURCHASED` routes to `EXIT-CONVERTED` (no Email 3 sent);
   Post-Purchase journey begins independently.
5. Fire `APIEvent-OrderShipped` then `APIEvent-OrderDelivered`.
6. Verify: shipping/delivery emails sent; 5 days later (simulate wait), review request sent.
7. Run `automation-studio/sql/14-recalculate-loyalty-tiers.sql` — verify a `ShopStyle_Loyalty` row is
   created reflecting the order total.
8. **Pass criteria**: no duplicate journey entries, no orphaned records (run
   [`../sql-validation/data-extension-integrity-checks.sql`](../sql-validation/data-extension-integrity-checks.sql)
   — expect zero rows), correct final `SubscriberStatus`/`CurrentTier`.

## IT-02: Abandoned Cart Overlapping Welcome Journey

1. New signup enters Welcome Journey (same as IT-01 step 1-2).
2. Before Welcome Journey completes, add items to cart via the Cart Activity API and let it abandon.
3. **Pass criteria**: subscriber is concurrently active in both Welcome and Abandoned Cart journeys
   without cross-interference (verify each journey's own `reEntryMode`/state is independent); confirm
   discount codes allocated by the Abandoned Cart journey do not collide with the Welcome Journey's
   `PromoCodeIssued` value.

## IT-03: CRM Suppression Overriding Marketing Sends

1. Seed `_SFCase` with an escalated, open case for a subscriber who is also mid-journey in an active
   promotional campaign (e.g., Winback).
2. Run `automation-studio/sql/21-crm-suppression-sync.sql`.
3. **Pass criteria**: `ShopStyle_Preferences.PromotionalOptIn` set to 0; subsequent Winback journey
   sends respect this (verify via the journey's suppression-aware exit criteria); Case Escalation
   Care journey (transactional classification) is **unaffected** and still sends.

## IT-04: Winback Sunset Does Not Break Other Journeys' Suppression Checks

1. Run a subscriber through the full Winback series to sunset (`SubscriberStatus='Sunset'`,
   `EmailOptIn=0`).
2. Attempt to re-enter them into Welcome, Abandoned Cart, and Birthday journeys (simulate a repeat
   signup with the same email, a new cart, and a birthday match).
3. **Pass criteria**: all three journeys' suppression-aware exit criteria
   (`SubscriberStatus IN ('Unsubscribed','Sunset') OR EmailOptIn = 0`) correctly exclude/exit the
   sunset subscriber — confirms the shared exit-criteria pattern is applied consistently, not just
   copy-pasted incorrectly into one journey.

## IT-05: DSAR Erasure Removes Data Without Breaking Downstream Automations

1. Run `node deployment/scripts/process-dsar-erasure.js --subscriber-key {key}` for a subscriber with
   active orders, cart activity, and loyalty data.
2. Run the full [Nightly-Contact-Hygiene automation test suite](../automation-tests/automation-test-plan.md#1-nightly-contact-hygiene).
3. **Pass criteria**: no automation errors reference the erased subscriber; `ShopStyle_ConsentLog`
   retains the DSAR record; `Shared_GlobalSuppressionList` contains the (anonymized) email so no
   future import can re-permission it.

## IT-06: Deployment Pipeline Idempotency

1. Run the full [deployment sequence](../../deployment/README.md#standard-deployment-sequence) twice
   in a row against a clean mock server instance.
2. **Pass criteria**: `validate-deployment.js` passes after both runs with identical counts (upsert
   behavior, not duplicate-insert behavior) — verified locally: 32/32 DEs, 5/5 automations, 5/5
   business units, 5/5 roles, 4/4 CloudPages on both runs.

## Sign-off Checklist

- [ ] IT-01 through IT-06 executed and passed in QA sandbox
- [ ] Data integrity checks clean after every scenario
- [ ] No automation error-log entries attributable to test-scenario data bleeding into unrelated flows
- [ ] Results reviewed against [`../../deployment/checklist.md`](../../deployment/checklist.md) before
      Production promotion
