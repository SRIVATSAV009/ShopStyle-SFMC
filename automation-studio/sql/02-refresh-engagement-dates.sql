/*
  Automation:  Nightly-Contact-Hygiene (Activity 2 of 4)
  Purpose:     Refresh ShopStyle_Subscribers.LastEngagementDate from the SFMC System Data Views
               (_Open, _Click, _SMSSubscriptionLog) so the 730-day retention policy
               (architecture/retention-policies.md) and re-engagement segmentation stay accurate.
  Schedule:    Daily 01:15 America/New_York, after 01-apply-global-suppression.sql.
  Source:      System Data Views _Open, _Click, _SMSSubscriptionLog (read-only, Query Studio/
               Automation Studio SQL Activity accessible views).
  Target DE:   ShopStyle_Subscribers (update in place)
*/

WITH LatestEmailEngagement AS (
    SELECT SubscriberKey, MAX(EventDate) AS LastEmailEngagementDate
    FROM (
        SELECT SubscriberKey, EventDate FROM _Open
        UNION ALL
        SELECT SubscriberKey, EventDate FROM _Click
    ) AS EmailEvents
    GROUP BY SubscriberKey
),
LatestSMSEngagement AS (
    SELECT MobileNumber, MAX(EventDate) AS LastSMSEngagementDate
    FROM _SMSSubscriptionLog
    WHERE EventType IN ('Inbound', 'KeywordResponse')
    GROUP BY MobileNumber
)
UPDATE sub
SET sub.LastEngagementDate = (
        SELECT MAX(d) FROM (VALUES
            (email.LastEmailEngagementDate),
            (sms.LastSMSEngagementDate),
            (sub.LastEngagementDate)
        ) AS AllDates(d)
    ),
    sub.LastModifiedDate = GETDATE()
FROM ShopStyle_Subscribers AS sub
LEFT JOIN LatestEmailEngagement AS email ON email.SubscriberKey = sub.SubscriberKey
LEFT JOIN LatestSMSEngagement AS sms ON sms.MobileNumber = sub.MobileNumber
WHERE email.LastEmailEngagementDate IS NOT NULL
   OR sms.LastSMSEngagementDate IS NOT NULL;
