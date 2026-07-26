/*
  Automation:  Nightly-Contact-Hygiene (Activity 3 of 4)
  Purpose:     Delete child-DE rows whose parent ShopStyle_Subscribers record has already been
               purged by the native Data Extension retention policy (architecture/retention-policies.md).
               Native DE retention policies do not cascade — this activity closes that gap.
  Schedule:    Daily 02:00 America/New_York, after the native retention policy sweep (01:30).
*/

DELETE pref
FROM ShopStyle_Preferences AS pref
LEFT JOIN ShopStyle_Subscribers AS sub ON sub.SubscriberKey = pref.SubscriberKey
WHERE sub.SubscriberKey IS NULL;

DELETE addr
FROM ShopStyle_Addresses AS addr
LEFT JOIN ShopStyle_Subscribers AS sub ON sub.SubscriberKey = addr.SubscriberKey
WHERE sub.SubscriberKey IS NULL;

DELETE loy
FROM ShopStyle_Loyalty AS loy
LEFT JOIN ShopStyle_Subscribers AS sub ON sub.SubscriberKey = loy.SubscriberKey
WHERE sub.SubscriberKey IS NULL;

DELETE cart
FROM ShopStyle_CartActivity AS cart
LEFT JOIN ShopStyle_Subscribers AS sub ON sub.SubscriberKey = cart.SubscriberKey
WHERE sub.SubscriberKey IS NULL;

-- NOTE: ShopStyle_Orders and ShopStyle_ConsentLog are intentionally NOT cascaded here.
-- Orders follow the separate archive-then-delete flow (10-archive-aged-orders.sql).
-- ConsentLog is a compliance record retained independently of the parent subscriber (7 years).
