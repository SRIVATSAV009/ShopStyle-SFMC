/*
  Automation:  Abandoned-Cart-Detection
  Purpose:     Flip carts with no activity for 30+ minutes from Active -> Abandoned, making them
               eligible for the Abandoned Cart journey's Data Extension entry source
               (journeys/abandoned-cart/abandoned-cart-journey.json filters CartStatus = 'Abandoned').
  Schedule:    Every 15 minutes, continuous (see automation-studio/config/abandoned-cart-detection.json)
  Target DE:   ShopStyle_CartActivity (update in place)
*/

UPDATE cart
SET
    cart.CartStatus = 'Abandoned'
FROM ShopStyle_CartActivity AS cart
INNER JOIN ShopStyle_Subscribers AS sub ON sub.SubscriberKey = cart.SubscriberKey
WHERE cart.CartStatus = 'Active'
  AND cart.ItemCount > 0
  AND cart.CartLastUpdatedDate <= DATEADD(minute, -30, GETDATE())
  AND sub.SubscriberStatus = 'Active'
  AND sub.EmailOptIn = 1;

-- Expire stale abandoned carts (>14 days) so they stop being journey-entry candidates
-- and become eligible for the retention-policy delete pass.
UPDATE cart
SET cart.CartStatus = 'Expired'
FROM ShopStyle_CartActivity AS cart
WHERE cart.CartStatus = 'Abandoned'
  AND cart.CartLastUpdatedDate <= DATEADD(day, -14, GETDATE());
