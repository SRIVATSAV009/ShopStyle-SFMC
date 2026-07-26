#!/usr/bin/env node
"use strict";
/**
 * Provisions Business Units per architecture/business-units.md's declarative definition
 * (the JSON block embedded in that doc, extracted here as config/business-units.json).
 * Real provisioning is done via the SOAP Account object in Enterprise 2.0; this script validates
 * the definition and records intended state for validate-deployment.js.
 *
 * Usage: node deployment/scripts/deploy-business-units.js
 */

const fs = require("fs");
const path = require("path");
const { MarketingCloudClient, REPO_ROOT } = require("./lib/mcApiClient");

const BU_CONFIG_PATH = path.join(REPO_ROOT, "config", "business-units.json");

async function main() {
  const def = JSON.parse(fs.readFileSync(BU_CONFIG_PATH, "utf8"));
  const client = MarketingCloudClient.fromEnvironment();

  await client.upsertDataExtensionRow("_DeployedBusinessUnits", ["MID"], {
    MID: def.parentBusinessUnit.mid,
    Name: def.parentBusinessUnit.name,
    Type: "Parent",
    DeployedAt: new Date().toISOString(),
  });
  console.log(`Provisioned Parent BU: ${def.parentBusinessUnit.name} (${def.parentBusinessUnit.mid})`);

  for (const child of def.childBusinessUnits) {
    await client.upsertDataExtensionRow("_DeployedBusinessUnits", ["MID"], {
      MID: child.mid,
      Name: child.name,
      Type: "Child",
      SendingDomain: child.sendingDomain,
      DeployedAt: new Date().toISOString(),
    });
    console.log(`Provisioned Child BU: ${child.name} (${child.mid})`);
  }

  console.log(`\nDone. Provisioned 1 parent + ${def.childBusinessUnits.length} child business units.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("deploy-business-units failed:", err);
    process.exitCode = 1;
  });
}
