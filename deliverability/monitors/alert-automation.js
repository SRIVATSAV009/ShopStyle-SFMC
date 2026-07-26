#!/usr/bin/env node
/**
 * Central deliverability + automation-failure alerting. Polls Automation_ErrorLog (Critical/Error
 * severity) and Reporting_DeliverabilitySummary (GuardrailStatus='BREACH') and pages the
 * Automation Operator role (see architecture/business-units.md#enterprise-roles) on any hit.
 *
 * Production equivalent: an Automation Studio Script Activity running hourly, or a scheduled
 * external job hitting the REST Data Extension Rowset API — this file is the reference/testable
 * implementation of that alerting logic, runnable standalone against the mock server.
 *
 * Usage: node deliverability/monitors/alert-automation.js
 */
"use strict";

const DEFAULT_MOCK_SERVER_BASE = process.env.SHOPSTYLE_MOCK_SERVER_URL || "http://localhost:4000";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request to ${url} failed: ${res.status}`);
  return res.json();
}

function formatErrorAlert(errorRows) {
  return errorRows
    .map((r) => `[${r.Severity}] ${r.AutomationName} / ${r.ActivityName}: ${r.ErrorMessage}`)
    .join("\n");
}

function formatDeliverabilityAlert(breachRows) {
  return breachRows
    .map(
      (r) =>
        `BU ${r.BusinessUnitMID} on ${r.SendDate}: bounce ${r.BounceRatePct.toFixed(2)}%, complaint ${r.ComplaintRatePct.toFixed(3)}% (guardrail: bounce <=2%, complaint <=0.1%)`
    )
    .join("\n");
}

async function sendAlert(channel, message) {
  // Reference implementation posts to the mock server's internal alert route
  // (api/mock-server/routes/internalAlert.js); production wiring is Slack webhook + PagerDuty.
  console.log(`\n--- ALERT (${channel}) ---\n${message}\n`);
  try {
    await fetch(`${DEFAULT_MOCK_SERVER_BASE}/internal/alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, message }),
    });
  } catch (err) {
    console.error("Failed to deliver alert to mock server (non-fatal for this script):", err.message);
  }
}

async function checkAutomationErrors() {
  const rows = await fetchJson(`${DEFAULT_MOCK_SERVER_BASE}/data/Automation_ErrorLog?resolved=false&severityIn=Error,Critical`);
  if (rows.length > 0) {
    await sendAlert("automation-ops", formatErrorAlert(rows));
  }
  return rows.length;
}

async function checkDeliverabilityBreaches() {
  const rows = await fetchJson(`${DEFAULT_MOCK_SERVER_BASE}/data/Reporting_DeliverabilitySummary?guardrailStatus=BREACH`);
  if (rows.length > 0) {
    await sendAlert("deliverability", formatDeliverabilityAlert(rows));
  }
  return rows.length;
}

async function main() {
  const [errorCount, breachCount] = await Promise.all([
    checkAutomationErrors().catch((err) => {
      console.error("checkAutomationErrors failed:", err.message);
      return 0;
    }),
    checkDeliverabilityBreaches().catch((err) => {
      console.error("checkDeliverabilityBreaches failed:", err.message);
      return 0;
    }),
  ]);

  console.log(`Alert sweep complete. Automation errors: ${errorCount}, deliverability breaches: ${breachCount}.`);
}

if (require.main === module) {
  main();
}

module.exports = { checkAutomationErrors, checkDeliverabilityBreaches, formatErrorAlert, formatDeliverabilityAlert };
