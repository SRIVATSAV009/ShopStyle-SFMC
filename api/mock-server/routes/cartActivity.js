"use strict";
/**
 * Mocks the Data Extension Rowset API for ShopStyle_CartActivity / ShopStyle_CartLineItems
 * (api/rest/cart-events.md). Real SFMC uses /data/v1/customobjectdata/key/{deKey}/rowset for any
 * DE; this file provides a cart-specific convenience path plus registers the generic route.
 */

const express = require("express");
const store = require("../store");

const router = express.Router();

const DE_KEY_MAP = {
  DE_SHOPSTYLE_CARTACTIVITY: { name: "ShopStyle_CartActivity", keyFields: ["CartId"] },
  DE_SHOPSTYLE_CARTLINEITEMS: { name: "ShopStyle_CartLineItems", keyFields: ["CartLineItemId"] },
};

router.post("/data/v1/customobjectdata/key/:deKey/rowset", (req, res) => {
  const mapping = DE_KEY_MAP[req.params.deKey];
  if (!mapping) {
    return res.status(404).json({ message: `Unknown Data Extension key: ${req.params.deKey}` });
  }

  const rows = Array.isArray(req.body) ? req.body : [];
  const results = rows.map((entry) => {
    const flatRow = { ...entry.keys, ...entry.values };
    return store.upsert(mapping.name, mapping.keyFields, flatRow);
  });

  return res.status(201).json({ upserted: results.length });
});

module.exports = router;
