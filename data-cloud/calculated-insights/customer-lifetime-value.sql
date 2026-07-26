/*
  Data Cloud Calculated Insight: Customer_Lifetime_Value
  Defined against Data Cloud's Data Model Objects (DMOs), which use ANSI SQL over the unified,
  identity-resolved individual graph (not raw Marketing Cloud Data Extensions — DMO names shown
  below correspond to the mapped Order/OrderLineItem/Individual DMOs configured in Data Cloud's
  Data Model canvas).

  Grain: One row per Unified Individual.
  Refresh: Daily, 03:30 America/New_York (after source data streams complete their nightly refresh).
*/

SELECT
    ind.ssot__Id__c                                            AS UnifiedIndividualId,
    SUM(ord.ssot__TotalAmount__c)                              AS LifetimeSpend,
    COUNT(DISTINCT ord.ssot__OrderNumber__c)                   AS LifetimeOrderCount,
    SUM(ord.ssot__TotalAmount__c) / NULLIF(COUNT(DISTINCT ord.ssot__OrderNumber__c), 0) AS AvgOrderValue,
    DATEDIFF(day, MIN(ord.ssot__OrderDate__c), MAX(ord.ssot__OrderDate__c))             AS CustomerTenureDays,
    MAX(ord.ssot__OrderDate__c)                                AS LastOrderDate,
    DATEDIFF(day, MAX(ord.ssot__OrderDate__c), CURRENT_DATE)   AS DaysSinceLastOrder,
    CASE
        WHEN SUM(ord.ssot__TotalAmount__c) >= 5000 AND DATEDIFF(day, MAX(ord.ssot__OrderDate__c), CURRENT_DATE) >= 90
            THEN 'HighValueAtRisk'
        WHEN SUM(ord.ssot__TotalAmount__c) >= 5000
            THEN 'HighValueActive'
        WHEN DATEDIFF(day, MAX(ord.ssot__OrderDate__c), CURRENT_DATE) >= 180
            THEN 'LowValueAtRisk'
        ELSE 'Standard'
    END                                                          AS ChurnRiskSegment
FROM ssot__Individual__dlm AS ind
INNER JOIN ssot__Order__dlm AS ord ON ord.ssot__BuyerId__c = ind.ssot__Id__c
WHERE ord.ssot__Status__c NOT IN ('Cancelled', 'Returned')
GROUP BY ind.ssot__Id__c;
