/*
  Purpose: Build the highest-engagement segment used during IP warm-up (Days 1-7).
           See architecture/ip-warming-strategy.md.
  Output:  Warmup_EngagedSegment (Automation Studio SQL Query Activity target DE)
*/

SELECT
    sub.SubscriberKey,
    sub.EmailAddress,
    sub.FirstName,
    sub.LastEngagementDate,
    sub.BusinessUnitMID
FROM ShopStyle_Subscribers AS sub
WHERE sub.SubscriberStatus = 'Active'
  AND sub.EmailOptIn = 1
  AND sub.LastEngagementDate >= DATEADD(day, -30, GETDATE())
ORDER BY sub.LastEngagementDate DESC;
