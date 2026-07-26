/*
  Data Cloud Calculated Insight: Category_Affinity
  Ranks each Unified Individual's top purchase category by spend share, used by Einstein Content
  Selection (../../einstein/content-selection.md) as a fallback signal when explicit
  ShopStyle_Preferences data is unavailable (e.g., a brand-new POS-only customer with no email
  preference-center interaction yet).
  Refresh: Daily, 03:45 America/New_York.
*/

WITH CategorySpend AS (
    SELECT
        ord.ssot__BuyerId__c                    AS UnifiedIndividualId,
        li.ssot__ProductCategory__c              AS Category,
        SUM(li.ssot__LineAmount__c)              AS CategorySpend
    FROM ssot__Order__dlm AS ord
    INNER JOIN ssot__OrderProductLineItem__dlm AS li ON li.ssot__OrderId__c = ord.ssot__Id__c
    WHERE ord.ssot__Status__c NOT IN ('Cancelled', 'Returned')
    GROUP BY ord.ssot__BuyerId__c, li.ssot__ProductCategory__c
),
RankedCategories AS (
    SELECT
        UnifiedIndividualId,
        Category,
        CategorySpend,
        ROW_NUMBER() OVER (PARTITION BY UnifiedIndividualId ORDER BY CategorySpend DESC) AS CategoryRank
    FROM CategorySpend
)
SELECT
    UnifiedIndividualId,
    MAX(CASE WHEN CategoryRank = 1 THEN Category END) AS TopCategory,
    MAX(CASE WHEN CategoryRank = 2 THEN Category END) AS SecondCategory,
    MAX(CASE WHEN CategoryRank = 1 THEN CategorySpend END) AS TopCategorySpend
FROM RankedCategories
WHERE CategoryRank <= 2
GROUP BY UnifiedIndividualId;
