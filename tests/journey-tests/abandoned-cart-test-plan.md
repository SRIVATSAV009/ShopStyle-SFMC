# Abandoned Cart Journey — Test Plan

Journey under test: [`journeys/abandoned-cart/abandoned-cart-journey.json`](../../journeys/abandoned-cart/abandoned-cart-journey.json)

## 1. Cart Activity API Tests

| Test ID | Scenario | Expected Result |
|---|---|---|
| AC-01 | Add item to cart (Rowset upsert, `CartStatus=Active`) | `ShopStyle_CartActivity` + `ShopStyle_CartLineItems` rows created/updated |
| AC-02 | No cart activity for 30+ minutes | `automation-studio/sql/11-detect-abandoned-carts.sql` flips `CartStatus` to `Abandoned` on next 15-min run |
| AC-03 | Checkout completes after abandonment | `CartStatus=Converted`, `RecoveredDate` set; journey decision split routes to early exit |
| AC-04 | Cart abandoned 14+ days | `CartStatus=Expired`; no longer eligible for journey entry |

## 2. Journey Entry Tests

| Test ID | Scenario | Expected Result |
|---|---|---|
| AC-05 | Cart flips to `Abandoned`, `RecoveryEmailsSent=0` | Entered into journey within one 15-min entry-source poll |
| AC-06 | Cart converts between abandonment and journey poll | Entry-source filter still matches (flip happens post-poll) → journey enters, but `DECISION-STILL-ABANDONED-1` immediately routes to `EXIT-CONVERTED-EARLY`, no email sent |

## 3. Decision Split / Discount Logic Matrix

| Test ID | Checkpoint | Cart State | Expected Outcome |
|---|---|---|---|
| AC-07 | Before Email 1 | Abandoned | Email 1 sent (no discount) |
| AC-08 | Before Email 1 | Converted | Exit, no email |
| AC-09 | Before Email 2 (T+24h) | Abandoned | Email 2 sent, code allocated from `AbandonedCart10` pool |
| AC-10 | Before Email 2 (T+24h) | Converted | Exit, no email, no code allocated |
| AC-11 | `ShopStyle_DiscountCodePool` exhausted for `AbandonedCart10` | Abandoned | Fallback shared code `CARTSAVE10` used (see `allocate-discount-code.amp`), ops alert triggered |
| AC-12 | Before SMS (T+26h) | SMSOptIn=1, still abandoned | SMS sent |
| AC-13 | Before SMS (T+26h) | SMSOptIn=0 | SMS skipped, waits align at T+72h regardless of branch |
| AC-14 | Before Email 3 (T+72h) | Abandoned | Email 3 sent, `AbandonedCart15` code, 24h expiration |
| AC-15 | Before Email 3 (T+72h) | Converted | Exit, no email |

## 4. Product Block Rendering Tests

- Cart with 1 item, in stock → single product block renders with live price.
- Cart with item that went **out of stock** after add-to-cart → block renders "out of stock" fallback,
  not the product image/price.
- Cart with item whose price changed since add-to-cart → email displays **current** catalog price, not
  the `UnitPrice` snapshot in `ShopStyle_CartLineItems` (verifies the `Shared_ProductCatalog` re-lookup
  in `abandoned-cart-product-blocks.amp`).
- Cart record with no matching `ShopStyle_CartLineItems` rows (data anomaly) → "cart details expired"
  fallback message, not a broken/empty table.

## 5. Discount Code Allocation Concurrency Test

- Simulate 50 concurrent Email 2 sends against a pool artificially constrained to 10 unused
  `AbandonedCart10` codes (`sample-data/discount-codes/constrained-pool.csv`) via the mock server's
  send-simulation harness (`api/mock-server/scripts/simulate-concurrent-sends.js`); verify:
  - Exactly 10 unique codes allocated, no code allocated twice (`AllocatedToSubscriberKey` uniqueness).
  - Remaining 40 sends fall back to `CARTSAVE10` without error.

## 6. SMS Tests

- Verify STOP keyword reply updates `ShopStyle_Preferences.SMSOptIn = 0` and the journey's next
  `DECISION-SMS-ELIGIBLE` check for that subscriber (on a future cart) correctly skips SMS.

## Sign-off Checklist

- [ ] AC-01–AC-04 cart lifecycle tests pass
- [ ] AC-05–AC-06 entry timing tests pass
- [ ] AC-07–AC-15 decision/discount matrix verified in QA sandbox
- [ ] Product block edge cases verified
- [ ] Concurrency test shows zero duplicate code allocation
- [ ] Deployment checklist item `journeys.abandoned-cart` marked complete
