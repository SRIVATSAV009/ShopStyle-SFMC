#!/usr/bin/env node
"use strict";
/**
 * Registers every automation-studio/config/*.json automation definition against the target
 * environment (mock server or real SFMC via SHOPSTYLE_MOCK_SERVER_URL). In a real deployment this
 * would call the Automation Studio REST API (POST /automation/v1/automations) per definition; here
 * it validates each definition's structure and records it for validate-deployment.js to confirm.
 *
 * Usage: node deployment/scripts/deploy-automations.js
 */

const fs = require("fs");
const path = require("path");
const { MarketingCloudClient, REPO_ROOT } = require("./lib/mcApiClient");

const AUTOMATION_CONFIG_DIR = path.join(REPO_ROOT, "automation-studio", "config");

function validateAutomationDefinition(def, fileName) {
  const errors = [];
  if (!def.automationName) errors.push("missing automationName");
  if (!def.customerKey) errors.push("missing customerKey");
  if (!def.schedule && !def.rampSchedule) errors.push("missing schedule");
  if (!def.steps && !def.rampSchedule && !def.guardrails) errors.push("missing steps");
  if (errors.length) throw new Error(`${fileName}: ${errors.join(", ")}`);
}

async function main() {
  const files = fs.readdirSync(AUTOMATION_CONFIG_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Found ${files.length} automation definitions`);

  const client = MarketingCloudClient.fromEnvironment();
  let deployed = 0;

  for (const file of files) {
    const def = JSON.parse(fs.readFileSync(path.join(AUTOMATION_CONFIG_DIR, file), "utf8"));
    validateAutomationDefinition(def, file);

    await client.upsertDataExtensionRow("_DeployedAutomations", ["AutomationName"], {
      AutomationName: def.automationName,
      CustomerKey: def.customerKey,
      Schedule: JSON.stringify(def.schedule || def.rampSchedule || {}),
      StepCount: (def.steps || []).length,
      DeployedAt: new Date().toISOString(),
    });
    console.log(`Deployed automation: ${def.automationName}`);
    deployed++;
  }

  console.log(`\nDone. Deployed ${deployed}/${files.length} automations.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("deploy-automations failed:", err);
    process.exitCode = 1;
  });
}

module.exports = { validateAutomationDefinition };
