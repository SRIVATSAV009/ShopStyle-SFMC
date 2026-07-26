/*
  Automation:  Winback-Sunset-Enforcement
  Purpose:     Enforce the sunset policy for subscribers who reach 270+ days without engagement AND
               have completed the full winback series without re-engaging (checked via
               ShopStyle_ConsentLog / journey completion flag written by the journey's final SQLQuery
               activity, WINBACK-LOG-SUNSET, before this automation runs).
  Schedule:    Weekly, Monday 07:00 America/New_York (after the Winback journey's Monday cohort
               has had its final decision-split evaluated).
  Notes:       Sunset sets EmailOptIn=0 and SubscriberStatus='Sunset' — distinct from 'Unsubscribed'.
               This preserves the historical fact that the subscriber never explicitly opted out
               (relevant for re-permission campaigns and regulatory recordkeeping) while still
               fully suppressing sends and protecting sender reputation.
*/

UPDATE sub
SET
    sub.SubscriberStatus = 'Sunset',
    sub.EmailOptIn = 0,
    sub.LastModifiedDate = GETDATE()
FROM ShopStyle_Subscribers AS sub
INNER JOIN Winback_Journey_Log AS log
    ON log.SubscriberKey = sub.SubscriberKey AND log.InactivityTier = 'Sunset'
WHERE sub.SubscriberStatus = 'Active'
  AND NOT EXISTS (
      SELECT 1 FROM _Open o WHERE o.SubscriberKey = sub.SubscriberKey AND o.EventDate >= log.EnteredDate
  )
  AND NOT EXISTS (
      SELECT 1 FROM _Click c WHERE c.SubscriberKey = sub.SubscriberKey AND c.EventDate >= log.EnteredDate
  );

INSERT INTO ShopStyle_ConsentLog (ConsentLogId, SubscriberKey, ChannelType, ConsentAction, ConsentSource, Timestamp)
SELECT
    CONCAT('SUNSET-', sub.SubscriberKey, '-', CAST(GETDATE() AS VARCHAR)),
    sub.SubscriberKey,
    'Email',
    'OptOut',
    'WinbackSunsetPolicy',
    GETDATE()
FROM ShopStyle_Subscribers AS sub
WHERE sub.SubscriberStatus = 'Sunset'
  AND sub.LastModifiedDate = CAST(GETDATE() AS DATE);
