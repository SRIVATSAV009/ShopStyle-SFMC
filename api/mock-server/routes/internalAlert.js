"use strict";
/**
 * Mocks the internal Slack/PagerDuty webhook target used by
 * journeys/case-escalation/case-escalation-journey.json's RESTCallout activity and
 * deliverability/monitors/alert-automation.js. Just logs and stores for test assertions.
 */

const express = require("express");
const store = require("../store");

const router = express.Router();

router.post("/internal/alert", (req, res) => {
  const { channel, message } = req.body || {};
  store.insert("_MockInternalAlertLog", ["AlertId"], {
    AlertId: `alert-${Date.now()}`,
    channel: channel || "unknown",
    message: message || "",
    receivedAt: new Date().toISOString(),
  });
  console.log(`[internal-alert:${channel}] ${message}`);
  res.status(200).json({ received: true });
});

module.exports = router;
