/*
  Automation:  Birthday-Journey-Entry-Detection
  Purpose:     Populate the Birthday_Journey_Entry staging DE each day with subscribers whose
               birthday is today (in their local timezone context, approximated here at the BU
               timezone level per architecture/business-units.md), who have not already been
               entered this calendar year.
  Schedule:    Daily 05:00 America/New_York.
  Target DE:   Birthday_Journey_Entry (journey Data Extension entry source)
*/

TRUNCATE TABLE Birthday_Journey_Entry;

INSERT INTO Birthday_Journey_Entry (SubscriberKey, EmailAddress, FirstName, CurrentTier, BirthdayYear)
SELECT
    sub.SubscriberKey,
    sub.EmailAddress,
    sub.FirstName,
    COALESCE(loy.CurrentTier, 'Bronze'),
    YEAR(GETDATE())
FROM ShopStyle_Subscribers AS sub
LEFT JOIN ShopStyle_Loyalty AS loy ON loy.SubscriberKey = sub.SubscriberKey
LEFT JOIN Birthday_Journey_Log AS log
    ON log.SubscriberKey = sub.SubscriberKey AND log.BirthdayYear = YEAR(GETDATE())
WHERE sub.SubscriberStatus = 'Active'
  AND sub.EmailOptIn = 1
  AND sub.DateOfBirth IS NOT NULL
  AND MONTH(sub.DateOfBirth) = MONTH(GETDATE())
  AND DAY(sub.DateOfBirth) = DAY(GETDATE())
  AND log.SubscriberKey IS NULL;

-- Log today's entrants so they are not re-entered later this year if the automation re-runs
INSERT INTO Birthday_Journey_Log (SubscriberKey, BirthdayYear, EnteredDate)
SELECT SubscriberKey, BirthdayYear, GETDATE()
FROM Birthday_Journey_Entry;
