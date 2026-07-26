# Einstein Engagement Scoring

Einstein Engagement Scoring is enabled at the Business Unit level (ShopStyle US) and generates
per-subscriber, per-channel scores (`Email Engagement Score`, 0-100) based on historical
open/click/send behavior, refreshed weekly by Einstein's native scoring job (no custom automation
required — this is a managed Marketing Cloud feature, exposed via the `_EinsteinScoreEmail` System
Data View).

## Consumption Points

| Use Case | How the Score Is Used |
|---|---|
| Winback prioritization | [`../sql/segmentation/`](../sql/segmentation/) segment logic can weight outreach order by score, so the highest-propensity-to-re-engage subscribers in a cohort are prioritized when send volume must be throttled during IP warm-up (see [`../architecture/ip-warming-strategy.md`](../architecture/ip-warming-strategy.md)) |
| Send frequency capping | Subscribers with a persistently low score (bottom decile, 4+ consecutive weeks) are automatically routed to `FrequencyPreference = 'Reduced'` by [`../automation-studio/sql/22-low-engagement-frequency-cap.sql`](../automation-studio/sql/22-low-engagement-frequency-cap.sql), rather than continuing to send at full cadence into a degrading engagement trend that risks spam-complaint/deliverability harm |
| Reporting | Score distribution tracked in [`../sql/reporting/engagement-score-distribution.sql`](../sql/reporting/engagement-score-distribution.sql) as a leading indicator alongside the lagging open/click-rate metrics in [`../sql/reporting/`](../sql/reporting/) |

## Query Pattern

```sql
SELECT
    sub.SubscriberKey,
    es.EngagementScore,
    es.ScoreDate
FROM ShopStyle_Subscribers AS sub
INNER JOIN _EinsteinScoreEmail AS es ON es.SubscriberKey = sub.SubscriberKey
WHERE es.ScoreDate = (SELECT MAX(ScoreDate) FROM _EinsteinScoreEmail)
ORDER BY es.EngagementScore ASC;
```

## Why Not Replace the Rule-Based Winback Journey

Einstein Engagement Scoring **informs prioritization and frequency**, but the rule-based Winback
journey ([`../journeys/winback/`](../journeys/winback/)) remains the system of record for the
sunset/suppression decision. A predictive score is probabilistic and can shift; suppression is a
compliance-adjacent, effectively-irreversible action (see
[`../architecture/retention-policies.md`](../architecture/retention-policies.md)) that should be driven
by observed behavior (documented non-engagement across a defined series), not a model score alone.
