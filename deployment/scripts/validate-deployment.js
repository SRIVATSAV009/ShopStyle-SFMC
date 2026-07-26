#!/usr/bin/env node
"use strict";
/**
 * Post-deployment validation: confirms that everything deploy-*.js was supposed to register is
 * actually present in the target environment, and that expected counts match the source-of-truth
 * files in the repo. Run this as the last step of every deployment (see deployment/checklist.md).
 *
 * Usage: node deployment/scripts/validate-deployment.js
 * Exit code: 0 if all checks pass, 1 if any check fails (suitable for a CI gate).
 */

const fs = require("fs");
const path = require("path");
const { MarketingCloudClient, REPO_ROOT } = require("./lib/mcApiClient");

async function countExpected(dirRelativePath, extension) {
  const dir = path.join(REPO_ROOT, dirRelativePath);
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith(extension)).length;
}

async function countDeployed(client, deName) {
  const res = await client.request("GET", `/data/${deName}`);
  return Array.isArray(res) ? res.length : 0;
}

async function check(name, expectedFn, actualFn) {
  const expected = await expectedFn();
  const actual = await actualFn();
  const pass = expected === actual;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}: expected ${expected}, found ${actual}`);
  return pass;
}

async function main() {
  const client = MarketingCloudClient.fromEnvironment();
  const results = [];

  results.push(
    await check(
      "Data Extensions",
      () => countExpected("config/data-extensions", ".json"),
      () => countDeployed(client, "_DeployedDataExtensions")
    )
  );
  results.push(
    await check(
      "Automations",
      () => countExpected("automation-studio/config", ".json"),
      () => countDeployed(client, "_DeployedAutomations")
    )
  );
  results.push(
    await check(
      "Business Units",
      async () => {
        const def = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "config", "business-units.json"), "utf8"));
        return 1 + def.childBusinessUnits.length;
      },
      () => countDeployed(client, "_DeployedBusinessUnits")
    )
  );
  results.push(
    await check(
      "Roles",
      async () => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "config", "roles.json"), "utf8")).roles.length,
      () => countDeployed(client, "_DeployedRoles")
    )
  );
  results.push(
    await check(
      "CloudPages",
      async () => {
        const { findHtmlPages } = require("./deploy-cloudpages");
        return findHtmlPages(path.join(REPO_ROOT, "cloudpages")).length;
      },
      () => countDeployed(client, "_DeployedCloudPages")
    )
  );

  const allPassed = results.every(Boolean);
  console.log(`\n${allPassed ? "All deployment validation checks passed." : "One or more validation checks FAILED."}`);
  if (!allPassed) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error("validate-deployment failed:", err);
    process.exitCode = 1;
  });
}
