/*
  Automation:  Loyalty-Tier-Recalculation
  Purpose:     Nightly recompute of trailing-12-month spend and loyalty tier for every enrolled
               subscriber. Tier thresholds mirror the loyalty program rules published at
               shopstyleretail.com/loyalty/tiers.
  Schedule:    Daily 04:00 America/New_York (after order archival completes at 02:15).
  Target DE:   ShopStyle_Loyalty (update in place)
*/

WITH TrailingSpend AS (
    SELECT
        o.SubscriberKey,
        SUM(o.OrderTotal) AS TTMSpend
    FROM ShopStyle_Orders AS o
    WHERE o.OrderStatus NOT IN ('Cancelled', 'Returned')
      AND o.OrderDate >= DATEADD(month, -12, GETDATE())
    GROUP BY o.SubscriberKey
),
TierAssignment AS (
    SELECT
        ts.SubscriberKey,
        ts.TTMSpend,
        CASE
            WHEN ts.TTMSpend >= 5000 THEN 'Platinum'
            WHEN ts.TTMSpend >= 2000 THEN 'Gold'
            WHEN ts.TTMSpend >= 500  THEN 'Silver'
            ELSE 'Bronze'
        END AS NewTier,
        CASE
            WHEN ts.TTMSpend >= 5000 THEN NULL
            WHEN ts.TTMSpend >= 2000 THEN 5000 - ts.TTMSpend
            WHEN ts.TTMSpend >= 500  THEN 2000 - ts.TTMSpend
            ELSE 500 - ts.TTMSpend
        END AS PointsToNextTierCalc
    FROM TrailingSpend AS ts
)
UPDATE loy
SET
    loy.TrailingTwelveMonthSpend = t.TTMSpend,
    loy.CurrentTier = t.NewTier,
    loy.PointsToNextTier = t.PointsToNextTierCalc,
    loy.TierEffectiveDate = CASE WHEN loy.CurrentTier <> t.NewTier THEN GETDATE() ELSE loy.TierEffectiveDate END,
    loy.TierExpirationDate = DATEADD(month, 12, GETDATE()),
    loy.LastRecalculatedDate = GETDATE()
FROM ShopStyle_Loyalty AS loy
INNER JOIN TierAssignment AS t ON t.SubscriberKey = loy.SubscriberKey;

-- Enroll subscribers with qualifying orders who don't yet have a loyalty record
INSERT INTO ShopStyle_Loyalty (SubscriberKey, LoyaltyMemberId, CurrentTier, PointsBalance, TrailingTwelveMonthSpend, EnrollmentDate, LastRecalculatedDate)
SELECT
    t.SubscriberKey,
    CONCAT('LOY-', t.SubscriberKey),
    t.NewTier,
    0,
    t.TTMSpend,
    GETDATE(),
    GETDATE()
FROM TierAssignment AS t
LEFT JOIN ShopStyle_Loyalty AS loy ON loy.SubscriberKey = t.SubscriberKey
WHERE loy.SubscriberKey IS NULL;
