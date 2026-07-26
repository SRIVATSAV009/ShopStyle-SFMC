/*
  Automation:  Order-Status-Timeout-Fallback
  Purpose:     Safety net for missed shipping-carrier webhooks. If an order is still 'Confirmed' the
               day before its estimated delivery date, synthetically advance it so the Post-Purchase
               journey (which waits on APIEvent-OrderShipped/APIEvent-OrderDelivered) does not stall.
  Schedule:    Hourly.
  Notes:       Flags rows for a downstream Script Activity (ssjs/automation/fire-fallback-events.ssjs)
               to POST the corresponding API events — SQL Activities cannot call the REST API directly.
*/

SELECT
    o.OrderId,
    o.SubscriberKey,
    'APIEvent-OrderShipped' AS FallbackEventType
INTO Staging_OrderStatusFallbackQueue
FROM ShopStyle_Orders AS o
WHERE o.OrderStatus = 'Confirmed'
  AND o.EstimatedDeliveryDate IS NOT NULL
  AND o.EstimatedDeliveryDate <= DATEADD(day, 1, GETDATE())

UNION ALL

SELECT
    o.OrderId,
    o.SubscriberKey,
    'APIEvent-OrderDelivered' AS FallbackEventType
FROM ShopStyle_Orders AS o
WHERE o.OrderStatus = 'Shipped'
  AND o.EstimatedDeliveryDate IS NOT NULL
  AND o.EstimatedDeliveryDate <= DATEADD(day, -1, GETDATE());
