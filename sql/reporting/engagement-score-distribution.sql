/*
  Purpose: Weekly Einstein Engagement Score distribution — leading indicator dashboard input,
           tracked alongside lagging open/click metrics (see deliverability-summary.sql).
*/

SELECT
    CASE
        WHEN es.EngagementScore >= 80 THEN '80-100 (Highly Engaged)'
        WHEN es.EngagementScore >= 60 THEN '60-79 (Engaged)'
        WHEN es.EngagementScore >= 40 THEN '40-59 (Moderate)'
        WHEN es.EngagementScore >= 20 THEN '20-39 (Low)'
        ELSE '0-19 (At Risk)'
    END AS ScoreBand,
    COUNT(DISTINCT es.SubscriberKey) AS SubscriberCount,
    AVG(es.EngagementScore) AS AvgScoreInBand
FROM _EinsteinScoreEmail AS es
WHERE es.ScoreDate = (SELECT MAX(ScoreDate) FROM _EinsteinScoreEmail)
GROUP BY
    CASE
        WHEN es.EngagementScore >= 80 THEN '80-100 (Highly Engaged)'
        WHEN es.EngagementScore >= 60 THEN '60-79 (Engaged)'
        WHEN es.EngagementScore >= 40 THEN '40-59 (Moderate)'
        WHEN es.EngagementScore >= 20 THEN '20-39 (Low)'
        ELSE '0-19 (At Risk)'
    END
ORDER BY MIN(es.EngagementScore) DESC;
