/*
  Automation:  Nightly-Contact-Hygiene (Activity 4 of 4)
  Purpose:     Stage orders older than 1095 days (3 years) into an archive Data Extension ahead of
               the native retention policy deleting them from ShopStyle_Orders. The archive DE is
               exported nightly via File Transfer Activity to the enterprise data lake
               (see automation-studio/file-transfer/export-order-archive.json) and then truncated.
  Schedule:    Daily 02:15 America/New_York.
  Target DE:   ShopStyle_Orders_Archive (staging, truncate-and-load pattern)
*/

TRUNCATE TABLE ShopStyle_Orders_Archive;

INSERT INTO ShopStyle_Orders_Archive (
    OrderId, SubscriberKey, OrderDate, OrderStatus, OrderTotal, Currency,
    ShippingCarrier, TrackingNumber, EstimatedDeliveryDate, ActualDeliveryDate, ArchivedDate
)
SELECT
    o.OrderId, o.SubscriberKey, o.OrderDate, o.OrderStatus, o.OrderTotal, o.Currency,
    o.ShippingCarrier, o.TrackingNumber, o.EstimatedDeliveryDate, o.ActualDeliveryDate, GETDATE()
FROM ShopStyle_Orders AS o
WHERE o.OrderDate < DATEADD(day, -1095, GETDATE());
