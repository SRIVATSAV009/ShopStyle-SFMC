# Order Status Webhook Events

Fired by the shipping-carrier/commerce-platform webhook receiver as order status changes, updating
`ShopStyle_Orders` and advancing the Post-Purchase journey via its `Wait Until Event` activities (see
[`../../journeys/post-purchase/post-purchase-journey.json`](../../journeys/post-purchase/post-purchase-journey.json)).

## POST /interaction/v1/events — APIEvent-OrderShipped

```json
{
  "ContactKey": "SUB-000482913",
  "EventDefinitionKey": "APIEvent-OrderShipped",
  "Data": {
    "SubscriberKey": "SUB-000482913",
    "OrderId": "ORD-2026-0088213",
    "ShippingCarrier": "UPS",
    "TrackingNumber": "1Z999AA10123456784",
    "ShippedDate": "2026-07-26T09:15:00Z",
    "EstimatedDeliveryDate": "2026-07-30"
  }
}
```

Handler also upserts `ShopStyle_Orders.OrderStatus = 'Shipped'` via the Rowset API before firing this
event, so the journey's `Wait Until Event` and the AMPscript tracking-number lookup stay consistent.

## POST /interaction/v1/events — APIEvent-OrderDelivered

```json
{
  "ContactKey": "SUB-000482913",
  "EventDefinitionKey": "APIEvent-OrderDelivered",
  "Data": {
    "SubscriberKey": "SUB-000482913",
    "OrderId": "ORD-2026-0088213",
    "ActualDeliveryDate": "2026-07-30T16:42:00Z"
  }
}
```

Sets `ShopStyle_Orders.OrderStatus = 'Delivered'`, `ActualDeliveryDate`.

## POST /interaction/v1/events — APIEvent-OrderReturned (exit signal)

```json
{
  "ContactKey": "SUB-000482913",
  "EventDefinitionKey": "APIEvent-OrderReturned",
  "Data": { "SubscriberKey": "SUB-000482913", "OrderId": "ORD-2026-0088213", "ReturnedDate": "2026-08-05T00:00:00Z" }
}
```

Sets `ShopStyle_Orders.OrderStatus = 'Returned'`. The journey's review-request decision split checks
this status and skips the review ask for returned orders (see journey `DECISION-NOT-RETURNED`).

## Fallback: Missed Webhook Safety Net

If a carrier webhook is dropped, [`../../automation-studio/sql/13-order-status-timeout-fallback.sql`](../../automation-studio/sql/13-order-status-timeout-fallback.sql)
runs hourly and force-advances any order stuck in `Confirmed` past its `EstimatedDeliveryDate - 1 day`
without a `Shipped` event, firing the same `APIEvent-OrderShipped`/`APIEvent-OrderDelivered` events
synthetically so the journey doesn't stall indefinitely waiting on a webhook that never arrives.
