# Welcome Journey — Test Plan

Journey under test: [`journeys/welcome/welcome-journey.json`](../../journeys/welcome/welcome-journey.json)

## 1. Entry Event Tests

| Test ID | Scenario | Payload Variant | Expected Result |
|---|---|---|---|
| WJ-01 | Valid signup, full data | `sample-data/journeys/welcome-entry-valid.json` | `202 Accepted`, contact enters journey within 60s |
| WJ-02 | Missing `SubscriberKey` | `sample-data/journeys/welcome-entry-missing-key.json` | `400 Bad Request`, journey not entered |
| WJ-03 | Duplicate entry while contact still in-journey | Same payload sent twice, 5s apart | Second call accepted by API (202) but does **not** create a second journey instance (`reEntryMode: NoReentryUntilExit`) |
| WJ-04 | Contact already on `Shared_GlobalSuppressionList` | `sample-data/journeys/welcome-entry-suppressed.json` | Enters journey, immediately routed to `EXIT-SUPPRESSED` at `DECISION-CHANNEL` |

## 2. Decision Split Matrix

| Split | Input State | Expected Branch |
|---|---|---|
| Channel Opt-In | `EmailOptIn=1, SMSOptIn=1` | Email+SMS → Email 1 sent, then SMS sent |
| Channel Opt-In | `EmailOptIn=1, SMSOptIn=0` | EmailOnly → Email 1 sent, no SMS |
| Channel Opt-In | `EmailOptIn=0` | Suppressed → immediate exit, no sends |
| Engagement (post Email 1) | `_Open` row exists for `EMAIL_WELCOME_01` | Engaged → Email 2 (Browse variant) |
| Engagement (post Email 1) | No `_Open` row | NotEngaged → Email 2 (Reminder variant) |
| Purchase Check | `ShopStyle_Orders` row with `OrderDate >= entry` | Purchased → `EXIT-CONVERTED`, no Email 3 |
| Purchase Check | No matching order | NotPurchased → Email 3 (Loyalty) sent |

## 3. Email Rendering Tests

- Render all 3 templates through Email Studio **Test Send** with 3 seed profiles:
  1. Subscriber with `ShopStyle_Preferences` row (`CategoryWomens=1, CategoryBeauty=1`) → verify Email 2
     product grid shows Women's category products.
  2. Subscriber with **no** `ShopStyle_Preferences` row → verify Email 2 falls back to Women's/Men's
     default (see `ampscript/email/welcome-product-recommendations.amp` fallback branch).
  3. Subscriber where `Shared_ProductCatalog` has zero `InStock=1` rows for the resolved category →
     verify the "no products" fallback message renders instead of an empty grid.
- Litmus/Email on Acid render check across Outlook (Windows), Gmail, Apple Mail — confirm table-based
  layout degrades cleanly (no dependency on flex/grid CSS).
- Preview & Test → confirm `%%=RedirectTo()=%%` links resolve through the tracking domain
  (`links.shopstyleretail.com`) and carry `utm_source`/`utm_campaign` params.

## 4. SMS Tests

- Confirm `SMS-SEND-WELCOME` only fires when `SMSOptIn=1`; verify STOP keyword handling routes through
  the `SHOPSTYLE` MobileConnect keyword program and updates `ShopStyle_Preferences.SMSOptIn = 0`.

## 5. Exit Criteria Tests

| Test ID | Scenario | Expected Result |
|---|---|---|
| WJ-EX-01 | Contact unsubscribes mid-journey (between Email 1 and Email 2) | Removed from journey before Email 2 send |
| WJ-EX-02 | Contact added to `Shared_GlobalSuppressionList` mid-journey | Removed from journey before next send |
| WJ-EX-03 | Contact completes all 3 emails without purchasing | Reaches `EXIT-COMPLETE`, eligible for other journeys (e.g., Abandoned Cart) immediately |

## 6. Load / Volume Test

- Fire 5,000 signup events over 60 seconds against the QA/Sandbox BU (`5000099`) via
  [`postman/ShopStyle-SFMC.postman_collection.json`](../../postman/ShopStyle-SFMC.postman_collection.json)
  run in Newman (`scripts/run-postman-load-test.sh`); confirm no `429` throttling and journey entry
  lag stays under 5 minutes at p95.

## Sign-off Checklist

- [ ] All WJ-0x entry tests pass
- [ ] All decision-split branches verified in QA sandbox
- [ ] Email/SMS rendering verified across target clients
- [ ] Exit criteria verified
- [ ] Load test p95 < 5 min entry lag
- [ ] Deployment checklist item `journeys.welcome` marked complete in [`deployment/checklist.md`](../../deployment/checklist.md)
