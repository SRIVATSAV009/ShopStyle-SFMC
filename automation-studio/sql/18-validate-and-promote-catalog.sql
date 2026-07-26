/*
  Automation:  Product-Catalog-Nightly-ETL (Step 3)
  Purpose:     Validate the staged product feed (reject rows with null SKU/price, negative inventory)
               and promote clean rows into the live Shared_ProductCatalog.
  Source DE:   Staging_ProductCatalogImport
  Target DE:   Shared_ProductCatalog (upsert)
*/

-- Reject and log invalid rows rather than silently dropping them
INSERT INTO Automation_ErrorLog (ErrorLogId, AutomationName, ActivityName, ErrorMessage, Severity, OccurredDate)
SELECT
    CONCAT('CATALOG-VALIDATION-', stg.SKU, '-', CAST(GETDATE() AS VARCHAR)),
    'Product-Catalog-Nightly-ETL',
    'Validate-And-Promote-Catalog',
    CONCAT('Invalid row rejected: SKU=', COALESCE(stg.SKU, 'NULL'), ', Price=', COALESCE(CAST(stg.Price AS VARCHAR), 'NULL'), ', InventoryCount=', COALESCE(CAST(stg.InventoryCount AS VARCHAR), 'NULL')),
    'Warning',
    GETDATE()
FROM Staging_ProductCatalogImport AS stg
WHERE stg.SKU IS NULL
   OR stg.Price IS NULL
   OR stg.Price < 0
   OR stg.InventoryCount < 0;

-- Update existing SKUs
UPDATE cat
SET
    cat.ProductName = stg.ProductName,
    cat.Category = stg.Category,
    cat.SubCategory = stg.SubCategory,
    cat.Brand = stg.Brand,
    cat.Price = stg.Price,
    cat.SalePrice = stg.SalePrice,
    cat.InStock = stg.InStock,
    cat.InventoryCount = stg.InventoryCount,
    cat.ImageURL = stg.ImageURL,
    cat.ProductURL = stg.ProductURL,
    cat.AvgRating = stg.AvgRating,
    cat.LastSyncedDate = GETDATE()
FROM Shared_ProductCatalog AS cat
INNER JOIN Staging_ProductCatalogImport AS stg ON stg.SKU = cat.SKU
WHERE stg.SKU IS NOT NULL AND stg.Price >= 0 AND stg.InventoryCount >= 0;

-- Insert new SKUs
INSERT INTO Shared_ProductCatalog (SKU, ProductName, Category, SubCategory, Brand, Price, SalePrice, InStock, InventoryCount, ImageURL, ProductURL, AvgRating, LastSyncedDate)
SELECT
    stg.SKU, stg.ProductName, stg.Category, stg.SubCategory, stg.Brand, stg.Price, stg.SalePrice,
    stg.InStock, stg.InventoryCount, stg.ImageURL, stg.ProductURL, stg.AvgRating, GETDATE()
FROM Staging_ProductCatalogImport AS stg
LEFT JOIN Shared_ProductCatalog AS cat ON cat.SKU = stg.SKU
WHERE cat.SKU IS NULL
  AND stg.SKU IS NOT NULL AND stg.Price >= 0 AND stg.InventoryCount >= 0;

-- Discontinue SKUs no longer present in today's feed (soft-delete, preserves historical order line-item joins)
UPDATE cat
SET cat.InStock = 0, cat.InventoryCount = 0, cat.LastSyncedDate = GETDATE()
FROM Shared_ProductCatalog AS cat
LEFT JOIN Staging_ProductCatalogImport AS stg ON stg.SKU = cat.SKU
WHERE stg.SKU IS NULL;
