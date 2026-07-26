/*
  Purpose: Daily deliverability health snapshot by sending domain/IP pool, feeding the guardrail
           checks referenced in architecture/ip-warming-strategy.md and the alert automation in
           deliverability/monitors/alert-automation.js.
*/

SELECT
    CAST(s.EventDate AS DATE)                                                                    AS SendDate,
    '5000011'                                                                                      AS BusinessUnitMID,
    COUNT(DISTINCT s.SubscriberKey)                                                                 AS SentCount,
    COUNT(DISTINCT b.SubscriberKey)                                                                  AS BounceCount,
    COUNT(DISTINCT CASE WHEN b.BounceCategory = 'Hard' THEN b.SubscriberKey END)                      AS HardBounceCount,
    COUNT(DISTINCT CASE WHEN b.BounceCategory = 'Soft' THEN b.SubscriberKey END)                       AS SoftBounceCount,
    COUNT(DISTINCT cx.SubscriberKey)                                                                    AS ComplaintCount,
    CAST(COUNT(DISTINCT b.SubscriberKey) AS DECIMAL(10,4)) / NULLIF(COUNT(DISTINCT s.SubscriberKey), 0) * 100      AS BounceRatePct,
    CAST(COUNT(DISTINCT cx.SubscriberKey) AS DECIMAL(10,4)) / NULLIF(COUNT(DISTINCT s.SubscriberKey), 0) * 100     AS ComplaintRatePct,
    CASE
        WHEN CAST(COUNT(DISTINCT b.SubscriberKey) AS DECIMAL(10,4)) / NULLIF(COUNT(DISTINCT s.SubscriberKey), 0) * 100 > 2.0
          OR CAST(COUNT(DISTINCT cx.SubscriberKey) AS DECIMAL(10,4)) / NULLIF(COUNT(DISTINCT s.SubscriberKey), 0) * 100 > 0.1
        THEN 'BREACH'
        ELSE 'OK'
    END                                                                                                  AS GuardrailStatus
FROM _Sent AS s
LEFT JOIN _Bounce AS b ON b.SubscriberKey = s.SubscriberKey AND b.JobID = s.JobID
LEFT JOIN _Complaint AS cx ON cx.SubscriberKey = s.SubscriberKey AND cx.JobID = s.JobID
WHERE s.EventDate >= DATEADD(day, -1, GETDATE())
GROUP BY CAST(s.EventDate AS DATE);
