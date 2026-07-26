/*
  Purpose: Program-level send performance by journey, using SFMC Tracking Data Views
           (_Sent, _Open, _Click, _Bounce, _Unsubscribe, _Complaint). Powers the "Click Rate by
           Journey" chart in docs/dashboards/marketing-performance-dashboard.html.
  Usage:   Automation Studio SQL Query Activity -> Reporting_CampaignPerformance,
           scheduled by automation-studio/config/reporting-refresh-automation.json.
*/

SELECT
    s.JobID,
    j.EmailName,
    -- EmailName is tagged with the owning journey at send time (e.g., "EMAIL_WELCOME_01") and
    -- mapped to a friendly journey label via a static lookup for reporting readability.
    CASE
        WHEN j.EmailName LIKE 'EMAIL_WELCOME%'   THEN 'Welcome'
        WHEN j.EmailName LIKE 'EMAIL_CART%'      THEN 'Abandoned Cart'
        WHEN j.EmailName LIKE 'EMAIL_PP%'        THEN 'Post-Purchase'
        WHEN j.EmailName LIKE 'EMAIL_BIRTHDAY%'  THEN 'Birthday'
        WHEN j.EmailName LIKE 'EMAIL_WINBACK%'   THEN 'Winback'
        WHEN j.EmailName LIKE 'EMAIL_VIP%'       THEN 'VIP Retention'
        ELSE 'Other / Ad Hoc Campaign'
    END AS JourneyLabel,
    COUNT(DISTINCT s.SubscriberKey)                                                              AS SentCount,
    COUNT(DISTINCT o.SubscriberKey)                                                               AS OpenCount,
    COUNT(DISTINCT c.SubscriberKey)                                                                AS ClickCount,
    COUNT(DISTINCT b.SubscriberKey)                                                                 AS BounceCount,
    COUNT(DISTINCT u.SubscriberKey)                                                                  AS UnsubscribeCount,
    COUNT(DISTINCT cx.SubscriberKey)                                                                  AS ComplaintCount,
    CAST(COUNT(DISTINCT o.SubscriberKey) AS DECIMAL(10,4)) / NULLIF(COUNT(DISTINCT s.SubscriberKey), 0) * 100 AS OpenRatePct,
    CAST(COUNT(DISTINCT c.SubscriberKey) AS DECIMAL(10,4)) / NULLIF(COUNT(DISTINCT s.SubscriberKey), 0) * 100 AS ClickRatePct,
    CAST(COUNT(DISTINCT b.SubscriberKey) AS DECIMAL(10,4)) / NULLIF(COUNT(DISTINCT s.SubscriberKey), 0) * 100 AS BounceRatePct,
    CAST(COUNT(DISTINCT cx.SubscriberKey) AS DECIMAL(10,4)) / NULLIF(COUNT(DISTINCT s.SubscriberKey), 0) * 100 AS ComplaintRatePct
FROM _Sent AS s
INNER JOIN _Sent AS j ON j.JobID = s.JobID AND j.SubscriberKey = s.SubscriberKey
LEFT JOIN _Open AS o ON o.SubscriberKey = s.SubscriberKey AND o.JobID = s.JobID
LEFT JOIN _Click AS c ON c.SubscriberKey = s.SubscriberKey AND c.JobID = s.JobID
LEFT JOIN _Bounce AS b ON b.SubscriberKey = s.SubscriberKey AND b.JobID = s.JobID
LEFT JOIN _Unsubscribe AS u ON u.SubscriberKey = s.SubscriberKey AND u.JobID = s.JobID
LEFT JOIN _Complaint AS cx ON cx.SubscriberKey = s.SubscriberKey AND cx.JobID = s.JobID
WHERE s.EventDate >= DATEADD(day, -30, GETDATE())
GROUP BY
    s.JobID, j.EmailName,
    CASE
        WHEN j.EmailName LIKE 'EMAIL_WELCOME%'   THEN 'Welcome'
        WHEN j.EmailName LIKE 'EMAIL_CART%'      THEN 'Abandoned Cart'
        WHEN j.EmailName LIKE 'EMAIL_PP%'        THEN 'Post-Purchase'
        WHEN j.EmailName LIKE 'EMAIL_BIRTHDAY%'  THEN 'Birthday'
        WHEN j.EmailName LIKE 'EMAIL_WINBACK%'   THEN 'Winback'
        WHEN j.EmailName LIKE 'EMAIL_VIP%'       THEN 'VIP Retention'
        ELSE 'Other / Ad Hoc Campaign'
    END;
