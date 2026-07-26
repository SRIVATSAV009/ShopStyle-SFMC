#!/usr/bin/env node
/**
 * IP Warm-up Guardrail Monitor — implements the threshold logic described in
 * architecture/ip-warming-strategy.md and automation-studio/config/ip-warmup-automation.json.
 * Intended to run as the equivalent of an SSJS Script Activity step at the end of each day's
 * warm-up send window; reference/testable implementation lives here in Node.
 *
 * Input: an array of { date, ipPool, sentCount, bounceCount, complaintCount } records
 * (in production, pulled from Reporting_DeliverabilitySummary via REST).
 */
"use strict";

const MAX_BOUNCE_RATE_PCT = 2.0;
const MAX_COMPLAINT_RATE_PCT = 0.1;

function evaluateDay(day) {
  const bounceRate = day.sentCount > 0 ? (day.bounceCount / day.sentCount) * 100 : 0;
  const complaintRate = day.sentCount > 0 ? (day.complaintCount / day.sentCount) * 100 : 0;
  const breached = bounceRate > MAX_BOUNCE_RATE_PCT || complaintRate > MAX_COMPLAINT_RATE_PCT;
  return { ...day, bounceRate, complaintRate, breached };
}

/**
 * Given a chronological history for one IP pool, determine the action for the *next* scheduled
 * ramp step per the strategy doc: hold flat on a single breach, roll back to prior day's volume
 * on two breaches within a rolling 3-day window.
 */
function determineAction(history) {
  const evaluated = history.map(evaluateDay);
  const last3 = evaluated.slice(-3);
  const breachesInWindow = last3.filter((d) => d.breached).length;
  const latest = evaluated[evaluated.length - 1];

  if (!latest) return { action: "PROCEED", reason: "No history yet" };

  if (breachesInWindow >= 2) {
    const priorDay = evaluated[evaluated.length - 2];
    return {
      action: "ROLLBACK",
      reason: `${breachesInWindow} guardrail breaches within the last 3 days`,
      rollbackToVolume: priorDay ? priorDay.sentCount : null,
    };
  }

  if (latest.breached) {
    return {
      action: "HOLD_FLAT",
      reason: `Guardrail breached today (bounce ${latest.bounceRate.toFixed(2)}%, complaint ${latest.complaintRate.toFixed(3)}%)`,
    };
  }

  return { action: "PROCEED", reason: "Within guardrails, continue ramp schedule" };
}

if (require.main === module) {
  // Example run with representative data.
  const sampleHistory = [
    { date: "2026-07-01", ipPool: "ip-pool-us-primary", sentCount: 1000, bounceCount: 8, complaintCount: 0 },
    { date: "2026-07-02", ipPool: "ip-pool-us-primary", sentCount: 5000, bounceCount: 55, complaintCount: 2 },
    { date: "2026-07-03", ipPool: "ip-pool-us-primary", sentCount: 5000, bounceCount: 120, complaintCount: 6 },
  ];
  const decision = determineAction(sampleHistory);
  console.log("Warm-up guardrail decision:", decision);
}

module.exports = { evaluateDay, determineAction, MAX_BOUNCE_RATE_PCT, MAX_COMPLAINT_RATE_PCT };
