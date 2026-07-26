/*
  Purpose: Compare Einstein Content Selection (treatment) vs rule-based AMPscript recommendations
           (control/holdout) click-through and downstream conversion, during the 30-day shadow rollout
           described in einstein/content-selection.md.
*/

SELECT
    exp.ContentVariant,  -- 'EinsteinContentSelection' | 'RuleBasedControl'
    COUNT(DISTINCT exp.SubscriberKey) AS Sent,
    COUNT(DISTINCT c.SubscriberKey) AS Clicked,
    CAST(COUNT(DISTINCT c.SubscriberKey) AS DECIMAL(10,2)) / NULLIF(COUNT(DISTINCT exp.SubscriberKey), 0) * 100 AS ClickRatePct,
    COUNT(DISTINCT ord.SubscriberKey) AS Converted,
    SUM(ord.OrderTotal) AS AttributedRevenue
FROM ShopStyle_ContentSelectionExperiment AS exp
LEFT JOIN _Click AS c
    ON c.SubscriberKey = exp.SubscriberKey AND c.EmailName = exp.EmailName AND c.EventDate >= exp.SendDate
LEFT JOIN ShopStyle_Orders AS ord
    ON ord.SubscriberKey = exp.SubscriberKey AND ord.OrderDate BETWEEN exp.SendDate AND DATEADD(day, 7, exp.SendDate)
GROUP BY exp.ContentVariant
ORDER BY exp.ContentVariant;
