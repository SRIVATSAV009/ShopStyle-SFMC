/*
  Automation:  Low-Engagement-Frequency-Cap
  Purpose:     Auto-reduce send frequency for subscribers whose Einstein Engagement Score has been in
               the bottom decile for 4+ consecutive weekly scoring cycles, protecting deliverability
               without fully sunsetting a subscriber who is still technically active.
  Schedule:    Weekly, Tuesday 06:00 America/New_York (after Einstein's weekly score refresh).
*/

WITH RecentScores AS (
    SELECT
        SubscriberKey,
        EngagementScore,
        ScoreDate,
        ROW_NUMBER() OVER (PARTITION BY SubscriberKey ORDER BY ScoreDate DESC) AS RecencyRank
    FROM _EinsteinScoreEmail
),
BottomDecileThreshold AS (
    SELECT PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY EngagementScore) AS ThresholdScore
    FROM RecentScores
    WHERE RecencyRank = 1
),
ConsistentlyLow AS (
    SELECT SubscriberKey
    FROM RecentScores
    WHERE RecencyRank <= 4
    GROUP BY SubscriberKey
    HAVING COUNT(*) = 4
       AND MAX(EngagementScore) <= (SELECT ThresholdScore FROM BottomDecileThreshold)
)
UPDATE pref
SET
    pref.FrequencyPreference = 'Reduced',
    pref.LastUpdated = GETDATE(),
    pref.UpdateSource = 'EinsteinLowEngagementCap'
FROM ShopStyle_Preferences AS pref
INNER JOIN ConsistentlyLow AS cl ON cl.SubscriberKey = pref.SubscriberKey
WHERE pref.FrequencyPreference = 'Standard';
