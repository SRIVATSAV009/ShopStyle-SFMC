"use strict";
/**
 * Loads sample-data/*.csv into the in-memory store on server startup, so journey/API tests have
 * realistic starting state without needing a live SFMC sandbox.
 */

const fs = require("fs");
const path = require("path");
const store = require("./store");

const SAMPLE_DATA_DIR = path.join(__dirname, "..", "..", "sample-data");

function parseCsv(content) {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i]; });
    return row;
  });
}

function loadCsvIntoDE(fileName, deName, keyFields) {
  const filePath = path.join(SAMPLE_DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`[seed] Skipping ${fileName} - not found at ${filePath}`);
    return 0;
  }
  const rows = parseCsv(fs.readFileSync(filePath, "utf8"));
  rows.forEach((row) => store.upsert(deName, keyFields, row));
  return rows.length;
}

function seedAll() {
  const loaded = {
    ShopStyle_Subscribers: loadCsvIntoDE("subscribers.csv", "ShopStyle_Subscribers", ["SubscriberKey"]),
    Shared_ProductCatalog: loadCsvIntoDE("products.csv", "Shared_ProductCatalog", ["SKU"]),
    ShopStyle_Orders: loadCsvIntoDE("orders.csv", "ShopStyle_Orders", ["OrderId"]),
    ShopStyle_CartActivity: loadCsvIntoDE("cart-activity.csv", "ShopStyle_CartActivity", ["CartId"]),
  };
  console.log("[seed] Loaded sample data:", loaded);
}

module.exports = { seedAll, parseCsv };
