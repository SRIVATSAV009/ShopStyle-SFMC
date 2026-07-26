/*
  Automation:  CRM-Suppression-Sync
  Purpose:     Suppress promotional sends for subscribers flagged Do-Not-Market in Sales Cloud, or
               currently in an escalated support case, without affecting transactional sends
               (order confirmations, shipping updates remain unaffected by this flag).
  Schedule:    Daily 01:30 America/New_York (after Nightly-Contact-Hygiene's suppression pass).
  Notes:       Uses a distinct field (PromotionalOptIn in ShopStyle_Preferences) rather than
               EmailOptIn/SubscriberStatus, since this is a soft, CRM-driven, promotional-only
               suppression — not a subscriber-initiated unsubscribe.
*/

UPDATE pref
SET
    pref.PromotionalOptIn = 0,
    pref.LastUpdated = GETDATE(),
    pref.UpdateSource = 'CRMSuppressionSync'
FROM ShopStyle_Preferences AS pref
INNER JOIN ShopStyle_Subscribers AS sub ON sub.SubscriberKey = pref.SubscriberKey
INNER JOIN Shared_CustomerIdentityBridge AS bridge ON bridge.SubscriberKey = sub.SubscriberKey
INNER JOIN _SFContact AS sf ON sf.Id = bridge.UnifiedIndividualId
WHERE (
    sf.DoNotMarket__c = 1
    OR EXISTS (
        SELECT 1 FROM _SFCase c
        WHERE c.ContactId = sf.Id AND c.Escalated__c = 1 AND c.Status <> 'Closed'
    )
)
AND pref.PromotionalOptIn = 1;

-- Re-enable promotional sends once the CRM condition clears (case closed, DoNotMarket unset)
UPDATE pref
SET
    pref.PromotionalOptIn = 1,
    pref.LastUpdated = GETDATE(),
    pref.UpdateSource = 'CRMSuppressionSync'
FROM ShopStyle_Preferences AS pref
INNER JOIN ShopStyle_Subscribers AS sub ON sub.SubscriberKey = pref.SubscriberKey
INNER JOIN Shared_CustomerIdentityBridge AS bridge ON bridge.SubscriberKey = sub.SubscriberKey
INNER JOIN _SFContact AS sf ON sf.Id = bridge.UnifiedIndividualId
WHERE pref.PromotionalOptIn = 0
  AND pref.UpdateSource = 'CRMSuppressionSync'
  AND sf.DoNotMarket__c = 0
  AND NOT EXISTS (
      SELECT 1 FROM _SFCase c WHERE c.ContactId = sf.Id AND c.Escalated__c = 1 AND c.Status <> 'Closed'
  );
