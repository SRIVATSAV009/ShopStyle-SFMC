/*
  Automation:  Product-Catalog-Nightly-ETL (Step 5) — Data Extract source query
  Purpose:     Produce a privacy-safe nightly order snapshot for the BI team. SubscriberKey is
               one-way hashed so BI can measure cohort/repeat-purchase behavior without handling PII.
  Notes:       SFMC SQL does not have a native SHA-256 function; hashing is performed by the
               Data Extract Activity's post-processing transform (documented here for traceability)
               using the salt stored in Config_Environment ('AnonymizationSalt', rotated quarterly).
*/

SELECT
    HASHBYTES('SHA2_256', CONCAT(o.SubscriberKey, (SELECT Value FROM Config_Environment WHERE Name = 'AnonymizationSalt'))) AS HashedCustomerId,
    o.OrderId,
    o.OrderDate,
    o.OrderStatus,
    o.OrderTotal,
    o.Currency,
    a.StateProvince,
    a.CountryCode
FROM ShopStyle_Orders AS o
LEFT JOIN ShopStyle_Addresses AS a
    ON a.SubscriberKey = o.SubscriberKey AND a.AddressType = 'Shipping' AND a.IsDefault = 1
WHERE o.OrderDate >= DATEADD(day, -1, GETDATE());
