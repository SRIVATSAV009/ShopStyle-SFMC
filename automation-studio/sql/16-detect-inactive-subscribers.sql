/*
  Automation:  Winback-Inactive-Detection
  Purpose:     Identify subscribers crossing an inactivity threshold (no open/click in 90/180/270
               days) using System Data Views, and stage them for Winback journey entry with a
               graduated InactivityTier driving message escalation and eventual sunset.
  Schedule:    Weekly, Monday 05:30 America/New_York.
  Source:      System Data Views _Sent, _Open, _Click (read-only).
  Target DE:   Winback_Journey_Entry
*/

WITH LastEngagement AS (
    SELECT
        s.SubscriberKey,
        MAX(s.EventDate) AS LastSendDate,
        MAX(o.EventDate) AS LastOpenDate,
        MAX(c.EventDate) AS LastClickDate
    FROM _Sent AS s
    LEFT JOIN _Open AS o ON o.SubscriberKey = s.SubscriberKey
    LEFT JOIN _Click AS c ON c.SubscriberKey = s.SubscriberKey
    GROUP BY s.SubscriberKey
),
InactivityCalc AS (
    SELECT
        le.SubscriberKey,
        DATEDIFF(day, (SELECT MAX(d) FROM (VALUES (le.LastOpenDate), (le.LastClickDate)) AS x(d)), GETDATE()) AS DaysSinceEngagement
    FROM LastEngagement AS le
)
INSERT INTO Winback_Journey_Entry (SubscriberKey, EmailAddress, FirstName, InactivityTier, DaysSinceEngagement, DetectedDate)
SELECT
    sub.SubscriberKey,
    sub.EmailAddress,
    sub.FirstName,
    CASE
        WHEN ic.DaysSinceEngagement >= 270 THEN 'Sunset'
        WHEN ic.DaysSinceEngagement >= 180 THEN 'Tier2_180Day'
        WHEN ic.DaysSinceEngagement >= 90  THEN 'Tier1_90Day'
    END,
    ic.DaysSinceEngagement,
    GETDATE()
FROM InactivityCalc AS ic
INNER JOIN ShopStyle_Subscribers AS sub ON sub.SubscriberKey = ic.SubscriberKey
LEFT JOIN Winback_Journey_Log AS log
    ON log.SubscriberKey = sub.SubscriberKey AND log.InactivityTier = CASE
        WHEN ic.DaysSinceEngagement >= 270 THEN 'Sunset'
        WHEN ic.DaysSinceEngagement >= 180 THEN 'Tier2_180Day'
        WHEN ic.DaysSinceEngagement >= 90  THEN 'Tier1_90Day'
    END
WHERE ic.DaysSinceEngagement >= 90
  AND sub.SubscriberStatus = 'Active'
  AND sub.EmailOptIn = 1
  AND log.SubscriberKey IS NULL;  -- don't re-enter the same tier twice

INSERT INTO Winback_Journey_Log (SubscriberKey, InactivityTier, EnteredDate)
SELECT SubscriberKey, InactivityTier, GETDATE() FROM Winback_Journey_Entry WHERE DetectedDate = CAST(GETDATE() AS DATE);
