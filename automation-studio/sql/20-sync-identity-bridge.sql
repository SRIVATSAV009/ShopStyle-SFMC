/*
  Automation:  CRM-Identity-Bridge-Sync
  Purpose:     Keep Shared_CustomerIdentityBridge current so marketing data (ShopStyle_Subscribers)
               and CRM data (_SFContact, synchronized by Marketing Cloud Connect) can be joined
               without embedding Salesforce Contact.Id directly in the marketing model.
  Schedule:    Every 30 minutes (offset from MC Connect's own 15-minute sync so _SFContact is fresh).
*/

INSERT INTO Shared_CustomerIdentityBridge (UnifiedIndividualId, BusinessUnitMID, SubscriberKey, MatchConfidenceScore, LastResolvedDate)
SELECT
    sf.Id,
    '5000011',
    sub.SubscriberKey,
    1.00,
    GETDATE()
FROM _SFContact AS sf
INNER JOIN ShopStyle_Subscribers AS sub ON sub.EmailAddress = sf.Email
LEFT JOIN Shared_CustomerIdentityBridge AS bridge
    ON bridge.SubscriberKey = sub.SubscriberKey AND bridge.BusinessUnitMID = '5000011'
WHERE bridge.SubscriberKey IS NULL
  AND sf.Email IS NOT NULL;

-- Refresh match confidence / resolved date for existing links where the CRM email changed
UPDATE bridge
SET bridge.LastResolvedDate = GETDATE()
FROM Shared_CustomerIdentityBridge AS bridge
INNER JOIN ShopStyle_Subscribers AS sub ON sub.SubscriberKey = bridge.SubscriberKey
INNER JOIN _SFContact AS sf ON sf.Id = bridge.UnifiedIndividualId
WHERE sub.EmailAddress = sf.Email
  AND bridge.BusinessUnitMID = '5000011';
