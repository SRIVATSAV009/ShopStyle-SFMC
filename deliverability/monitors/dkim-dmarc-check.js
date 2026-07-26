#!/usr/bin/env node
/**
 * DKIM / DMARC / SPF presence and configuration checker.
 * Run nightly (or on-demand before a domain cutover) against every sending domain in
 * config/sending-profiles.json. Verifies the DNS records documented in
 * architecture/sender-authentication.md actually resolve as expected.
 *
 * Usage: node deliverability/monitors/dkim-dmarc-check.js
 */
"use strict";

const dns = require("dns").promises;
const fs = require("fs");
const path = require("path");

const SENDING_PROFILES_PATH = path.join(__dirname, "..", "..", "config", "sending-profiles.json");

async function checkSpf(domain) {
  try {
    const records = await dns.resolveTxt(domain);
    const spf = records.flat().find((r) => r.startsWith("v=spf1"));
    if (!spf) return { pass: false, detail: "No SPF TXT record found" };
    const hasInclude = spf.includes("include:cust-spf.exacttarget.com");
    const isHardfail = spf.includes("-all");
    return {
      pass: hasInclude,
      detail: spf,
      warning: !isHardfail ? "SPF is not yet hardfail (-all) — confirm this is intentional warm-up softfail (~all)" : null,
    };
  } catch (err) {
    return { pass: false, detail: `DNS lookup failed: ${err.code || err.message}` };
  }
}

async function checkDkim(domain) {
  const selector = `sig1._domainkey.${domain}`;
  try {
    const records = await dns.resolveCname(selector);
    const pass = records.some((r) => r.includes("dkim.exacttarget.com"));
    return { pass, detail: records.join(", ") };
  } catch (err) {
    return { pass: false, detail: `DKIM CNAME lookup failed at ${selector}: ${err.code || err.message}` };
  }
}

async function checkDmarc(rootDomain) {
  const dmarcHost = `_dmarc.${rootDomain}`;
  try {
    const records = await dns.resolveTxt(dmarcHost);
    const dmarc = records.flat().find((r) => r.startsWith("v=DMARC1"));
    if (!dmarc) return { pass: false, detail: "No DMARC TXT record found" };
    const policyMatch = dmarc.match(/p=(\w+)/);
    const policy = policyMatch ? policyMatch[1] : "unknown";
    return {
      pass: true,
      detail: dmarc,
      warning: policy === "none" ? "DMARC policy is still 'none' (monitor-only) — confirm rollout stage" : null,
    };
  } catch (err) {
    return { pass: false, detail: `DMARC lookup failed at ${dmarcHost}: ${err.code || err.message}` };
  }
}

function rootDomainOf(sendingDomain) {
  const parts = sendingDomain.split(".");
  return parts.slice(-2).join(".");
}

async function main() {
  const profiles = JSON.parse(fs.readFileSync(SENDING_PROFILES_PATH, "utf8")).sendingProfiles;
  let anyFailure = false;

  for (const profile of profiles) {
    const domain = profile.sendingDomain;
    const root = rootDomainOf(domain);
    console.log(`\n=== ${profile.name} (${domain}) ===`);

    const [spf, dkim, dmarc] = await Promise.all([checkSpf(domain), checkDkim(domain), checkDmarc(root)]);

    for (const [label, result] of [["SPF", spf], ["DKIM", dkim], ["DMARC", dmarc]]) {
      const status = result.pass ? "PASS" : "FAIL";
      console.log(`  ${label}: ${status} - ${result.detail}`);
      if (result.warning) console.log(`    WARNING: ${result.warning}`);
      if (!result.pass) anyFailure = true;
    }
  }

  if (anyFailure) {
    console.error("\nOne or more sender authentication checks FAILED. See docs/runbook.md#deliverability-incident.");
    process.exitCode = 1;
  } else {
    console.log("\nAll sender authentication checks passed.");
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("dkim-dmarc-check failed to run:", err);
    process.exitCode = 1;
  });
}

module.exports = { checkSpf, checkDkim, checkDmarc };
