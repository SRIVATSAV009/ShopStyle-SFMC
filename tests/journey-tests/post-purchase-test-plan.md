# Post-Purchase Journey — Test Plan

Journey under test: [`journeys/post-purchase/post-purchase-journey.json`](../../journeys/post-purchase/post-purchase-journey.json)

## 1. Transactional Send Tests

| Test ID | Scenario | Expected Result |
|---|---|---|
| PP-01 | Valid checkout completion | Order confirmation delivered within seconds via Transactional Messaging API; `APIEvent-OrderPlaced` fired in parallel |
| PP-02 | Transactional API returns 5xx (simulated outage) | Caller retries per `transactionalClient.js` backoff policy; journey entry (separate call) is unaffected |

## 2. Wait Until Event Tests

| Test ID | Scenario | Expected Result |
|---|---|---|
| PP-03 | `APIEvent-OrderShipped` fires within 10 days, `OrderId` matches | Journey proceeds to Shipping email immediately |
| PP-04 | No shipped event within 10 days | Routes to `EXIT-SHIP-TIMEOUT`; verify ops alert fired (`docs/runbook.md`) |
| PP-05 | `APIEvent-OrderDelivered` fires within 14 days of shipping | Journey proceeds to Delivery email |
| PP-06 | No delivered event within 14 days | Routes to `EXIT-DELIVERY-TIMEOUT` |
| PP-07 | Missed webhook, but `automation-studio/sql/13-order-status-timeout-fallback.sql` fires synthetic event before timeout | Journey proceeds normally, no timeout exit |

## 3. Review / Cross-Sell Decision Tests

| Test ID | Scenario | Expected Result |
|---|---|---|
| PP-08 | Order not returned within 5 days post-delivery | Review Request sent |
| PP-09 | Order marked `Returned` before day 5 | Routes to `EXIT-RETURNED`, no Review/Cross-sell sent |
| PP-10 | Cross-sell email, order with 1 line item (Womens category) | Recommends 4 in-stock Womens products, excluding purchased SKU |
| PP-11 | Cross-sell email, all Womens catalog SKUs already purchased or out of stock | Falls back to generic "explore more" message, no empty grid |

## 4. Multi-Order Concurrency Test

- PP-12: Subscriber places 2 orders within the same hour → verify two independent journey instances
  (keyed by `OrderId` at the activity-matching level via `matchOn: "OrderId = Entry.OrderId"`), each
  progressing independently through Wait Until Event activities without cross-contamination.

## 5. Rendering Tests

- Order confirmation: verify all transactional attributes (`OrderId`, `OrderTotal`, `OrderDate`,
  `EstimatedDeliveryDate`) render correctly from the Messaging API payload (not journey contact
  attributes — different data source, common integration-test gap).
- Shipping email: verify `ShopStyle_Orders` lookup for `TrackingNumber`/`ShippingCarrier` handles a
  missing row gracefully (should not occur in practice since the webhook sets these before firing the
  event, but the AMPscript `LookupRows` result should not throw if `RowCount = 0`).

## Sign-off Checklist

- [ ] PP-01–PP-02 transactional send tests pass
- [ ] PP-03–PP-07 wait-until-event + fallback tests pass
- [ ] PP-08–PP-11 review/cross-sell decision tests pass
- [ ] PP-12 concurrency test passes
- [ ] Deployment checklist item `journeys.post-purchase` marked complete
