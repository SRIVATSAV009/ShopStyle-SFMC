/*
  Purpose: Analyze Birthday Journey Random Split A/B test performance — joins variant assignment
           to email engagement (Tracking Data Views) and downstream purchase conversion.
  Usage:   Automation Studio SQL Query Activity -> AB_Test_Results_Summary, or run ad hoc in
           Query Studio for the monthly loyalty marketing review.
*/

SELECT
    ab.TestName,
    ab.Variant,
    COUNT(DISTINCT ab.SubscriberKey)                                                  AS Sent,
    COUNT(DISTINCT o.SubscriberKey)                                                    AS Opens,
    COUNT(DISTINCT c.SubscriberKey)                                                    AS Clicks,
    COUNT(DISTINCT ord.SubscriberKey)                                                  AS Conversions,
    CAST(COUNT(DISTINCT o.SubscriberKey) AS DECIMAL(10,2)) / NULLIF(COUNT(DISTINCT ab.SubscriberKey), 0) * 100  AS OpenRatePct,
    CAST(COUNT(DISTINCT c.SubscriberKey) AS DECIMAL(10,2)) / NULLIF(COUNT(DISTINCT ab.SubscriberKey), 0) * 100  AS ClickRatePct,
    CAST(COUNT(DISTINCT ord.SubscriberKey) AS DECIMAL(10,2)) / NULLIF(COUNT(DISTINCT ab.SubscriberKey), 0) * 100 AS ConversionRatePct,
    SUM(ord.OrderTotal)                                                                AS AttributedRevenue
FROM ShopStyle_ABTestResults AS ab
LEFT JOIN _Open AS o
    ON o.SubscriberKey = ab.SubscriberKey AND o.EmailName = ab.EmailNameSent AND o.EventDate >= ab.EntryDate
LEFT JOIN _Click AS c
    ON c.SubscriberKey = ab.SubscriberKey AND c.EmailName = ab.EmailNameSent AND c.EventDate >= ab.EntryDate
LEFT JOIN ShopStyle_Orders AS ord
    ON ord.SubscriberKey = ab.SubscriberKey
   AND ord.OrderDate BETWEEN ab.EntryDate AND DATEADD(day, 14, ab.EntryDate)
WHERE ab.TestName = 'Birthday Creative Test'
GROUP BY ab.TestName, ab.Variant
ORDER BY ab.Variant;
