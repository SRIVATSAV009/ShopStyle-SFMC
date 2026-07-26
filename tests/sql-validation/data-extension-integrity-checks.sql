/*
  Purpose: Run in Query Studio (or as a temporary Automation Studio SQL Activity) after any bulk
           import or schema change to catch referential/data-integrity problems before they surface
           as broken personalization in a live send. Each SELECT should return zero rows; any row
           returned is a defect to investigate before the next journey send.
*/

-- 1. Orphaned child records: Preferences with no parent Subscriber
SELECT 'Orphaned ShopStyle_Preferences' AS CheckName, pref.SubscriberKey
FROM ShopStyle_Preferences AS pref
LEFT JOIN ShopStyle_Subscribers AS sub ON sub.SubscriberKey = pref.SubscriberKey
WHERE sub.SubscriberKey IS NULL;

-- 2. Orphaned order line items: no parent order
SELECT 'Orphaned ShopStyle_OrderLineItems' AS CheckName, li.LineItemId
FROM ShopStyle_OrderLineItems AS li
LEFT JOIN ShopStyle_Orders AS o ON o.OrderId = li.OrderId
WHERE o.OrderId IS NULL;

-- 3. Order line items referencing a SKU not in the product catalog (breaks cross-sell/product-block AMPscript)
SELECT 'OrderLineItems with unknown SKU' AS CheckName, li.LineItemId, li.SKU
FROM ShopStyle_OrderLineItems AS li
LEFT JOIN Shared_ProductCatalog AS cat ON cat.SKU = li.SKU
WHERE cat.SKU IS NULL;

-- 4. Subscribers marked Active/EmailOptIn=1 but present on the global suppression list
--    (should have been caught by 01-apply-global-suppression.sql — indicates that automation is stale or failed)
SELECT 'Active subscriber on suppression list' AS CheckName, sub.SubscriberKey, sub.EmailAddress
FROM ShopStyle_Subscribers AS sub
INNER JOIN Shared_GlobalSuppressionList AS supp ON supp.EmailAddress = sub.EmailAddress
WHERE sub.SubscriberStatus = 'Active' AND sub.EmailOptIn = 1;

-- 5. Duplicate primary keys within a DE that should be unique (defensive check — SFMC enforces PK
--    uniqueness natively, but this catches upsert logic bugs during migration/import windows)
SELECT 'Duplicate SubscriberKey in ShopStyle_Subscribers' AS CheckName, SubscriberKey, COUNT(*) AS Cnt
FROM ShopStyle_Subscribers
GROUP BY SubscriberKey
HAVING COUNT(*) > 1;

-- 6. Loyalty tier inconsistent with recorded spend (catches a stale/failed tier recalculation run)
SELECT 'Loyalty tier does not match spend bracket' AS CheckName, loy.SubscriberKey, loy.CurrentTier, loy.TrailingTwelveMonthSpend
FROM ShopStyle_Loyalty AS loy
WHERE (loy.TrailingTwelveMonthSpend >= 5000 AND loy.CurrentTier <> 'Platinum')
   OR (loy.TrailingTwelveMonthSpend >= 2000 AND loy.TrailingTwelveMonthSpend < 5000 AND loy.CurrentTier <> 'Gold')
   OR (loy.TrailingTwelveMonthSpend >= 500  AND loy.TrailingTwelveMonthSpend < 2000 AND loy.CurrentTier <> 'Silver')
   OR (loy.TrailingTwelveMonthSpend < 500 AND loy.CurrentTier <> 'Bronze');

-- 7. Cart line items referencing a cart that no longer exists (cascade-delete gap)
SELECT 'Orphaned ShopStyle_CartLineItems' AS CheckName, cli.CartLineItemId
FROM ShopStyle_CartLineItems AS cli
LEFT JOIN ShopStyle_CartActivity AS cart ON cart.CartId = cli.CartId
WHERE cart.CartId IS NULL;

-- 8. Consent log rows with a future timestamp (clock skew / bad manual insert)
SELECT 'ConsentLog with future timestamp' AS CheckName, ConsentLogId, Timestamp
FROM ShopStyle_ConsentLog
WHERE Timestamp > GETDATE();
