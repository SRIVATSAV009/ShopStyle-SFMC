#!/usr/bin/env node
"use strict";
/**
 * Applies the Enterprise Role definitions in config/roles.json (see
 * architecture/business-units.md#enterprise-roles) via the SOAP AccountUser/Role API in a real
 * deployment; here, validates the definition and records intended state.
 *
 * Usage: node deployment/scripts/deploy-roles.js
 */

const fs = require("fs");
const path = require("path");
const { MarketingCloudClient, REPO_ROOT } = require("./lib/mcApiClient");

const ROLES_CONFIG_PATH = path.join(REPO_ROOT, "config", "roles.json");

function validateRole(role) {
  const errors = [];
  if (!role.name) errors.push("missing name");
  if (!["parent", "child"].includes(role.scope)) errors.push("scope must be 'parent' or 'child'");
  if (!Array.isArray(role.permissions) || role.permissions.length === 0) errors.push("permissions must be a non-empty array");
  if (errors.length) throw new Error(`Role "${role.name || "unnamed"}": ${errors.join(", ")}`);
}

async function main() {
  const def = JSON.parse(fs.readFileSync(ROLES_CONFIG_PATH, "utf8"));
  const client = MarketingCloudClient.fromEnvironment();

  for (const role of def.roles) {
    validateRole(role);
    await client.upsertDataExtensionRow("_DeployedRoles", ["Name"], {
      Name: role.name,
      Scope: role.scope,
      PermissionCount: role.permissions.length,
      AssignedUserCount: (role.assignedUsers || []).length,
      DeployedAt: new Date().toISOString(),
    });
    console.log(`Deployed role: ${role.name} (${role.scope}, ${role.permissions.length} permissions)`);
  }

  console.log(`\nDone. Deployed ${def.roles.length} roles.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("deploy-roles failed:", err);
    process.exitCode = 1;
  });
}

module.exports = { validateRole };
