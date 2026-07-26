"use strict";
/**
 * Generic Data Extension read/write routes used by deliverability/monitors/alert-automation.js and
 * by tests that need to assert on arbitrary DE state (e.g. "was ShopStyle_Loyalty updated").
 * Not a 1:1 mock of any single real SFMC endpoint — a test-convenience superset covering both the
 * Data Extension Rowset API shape and simple query-string filtering for assertions.
 */

const express = require("express");
const store = require("../store");

const router = express.Router();

router.get("/data/:deName", (req, res) => {
  const filters = { ...req.query };
  delete filters.resolved;
  delete filters.severityIn;
  delete filters.guardrailStatus;

  let rows = store.all(req.params.deName);

  if (req.query.resolved !== undefined) {
    rows = rows.filter((r) => String(r.Resolved) === req.query.resolved);
  }
  if (req.query.severityIn) {
    const severities = req.query.severityIn.split(",");
    rows = rows.filter((r) => severities.includes(r.Severity));
  }
  if (req.query.guardrailStatus) {
    rows = rows.filter((r) => r.GuardrailStatus === req.query.guardrailStatus);
  }
  for (const [field, value] of Object.entries(filters)) {
    rows = rows.filter((r) => String(r[field]) === String(value));
  }

  res.json(rows);
});

router.post("/data/:deName", (req, res) => {
  const { keyFields, row } = req.body || {};
  if (!keyFields || !row) {
    return res.status(400).json({ message: "keyFields and row are required" });
  }
  const saved = store.upsert(req.params.deName, keyFields, row);
  res.status(201).json(saved);
});

module.exports = router;
