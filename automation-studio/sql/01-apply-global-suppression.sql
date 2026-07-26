/*
  Automation:  Nightly-Contact-Hygiene (Activity 1 of 4)
  Purpose:     Flag subscribers present on the Parent-BU shared suppression list so downstream
               journeys and Email Studio sends exclude them, without physically deleting the
               subscriber record (deletion is handled separately by retention policy).
  Schedule:    Daily 01:00 America/New_York, before any journey-entry SQL Query Activities run.
  Target DE:   ShopStyle_Subscribers (update in place)
  Notes:       Shared_GlobalSuppressionList is a Parent-BU shared Data Extension (read-only from
               this Child BU) — see architecture/business-units.md.
*/

UPDATE sub
SET
    sub.SubscriberStatus = CASE
        WHEN supp.SuppressionReason = 'HardBounce'     THEN 'Bounced'
        WHEN supp.SuppressionReason = 'SpamComplaint'   THEN 'Unsubscribed'
        WHEN supp.SuppressionReason = 'Unsubscribe'     THEN 'Unsubscribed'
        WHEN supp.SuppressionReason = 'LegalOptOut'     THEN 'Unsubscribed'
        ELSE sub.SubscriberStatus
    END,
    sub.EmailOptIn = 0,
    sub.LastModifiedDate = GETDATE()
FROM ShopStyle_Subscribers AS sub
INNER JOIN Shared_GlobalSuppressionList AS supp
    ON supp.EmailAddress = sub.EmailAddress
WHERE sub.SubscriberStatus <> 'Unsubscribed'
   OR sub.EmailOptIn = 1;
