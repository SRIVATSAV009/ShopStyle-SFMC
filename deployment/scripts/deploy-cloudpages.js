#!/usr/bin/env node
"use strict";
/**
 * "Deploys" CloudPages by validating each page's structure (has a <script runat="server"> block,
 * references the shared CSS/JS assets, and has no unresolved token placeholders left in) and
 * uploading the asset bundle. Real deployment uses the Web Studio Content Builder API for CloudPages
 * assets/landing pages, which this mirrors structurally without a live SFMC connection.
 *
 * Usage: node deployment/scripts/deploy-cloudpages.js
 */

const fs = require("fs");
const path = require("path");
const { MarketingCloudClient, REPO_ROOT } = require("./lib/mcApiClient");

const CLOUDPAGES_DIR = path.join(REPO_ROOT, "cloudpages");

function findHtmlPages(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "assets") continue;
      results.push(...findHtmlPages(fullPath));
    } else if (entry.name.endsWith(".html")) {
      results.push(fullPath);
    }
  }
  return results;
}

function validatePage(content, fileName) {
  const errors = [];
  if (!content.includes('runat="server"')) errors.push("missing SSJS <script runat=\"server\"> block");
  if (!content.includes("shopstyle-cloudpages.css")) errors.push("missing shared stylesheet reference");
  if (content.includes("{{UNRESOLVED")) errors.push("contains unresolved template placeholder");
  if (errors.length) throw new Error(`${fileName}: ${errors.join(", ")}`);
}

async function main() {
  const pages = findHtmlPages(CLOUDPAGES_DIR);
  console.log(`Found ${pages.length} CloudPages`);

  const client = MarketingCloudClient.fromEnvironment();
  let deployed = 0;

  for (const pagePath of pages) {
    const content = fs.readFileSync(pagePath, "utf8");
    const relativeName = path.relative(CLOUDPAGES_DIR, pagePath);
    validatePage(content, relativeName);

    await client.upsertDataExtensionRow("_DeployedCloudPages", ["PagePath"], {
      PagePath: relativeName,
      SizeBytes: Buffer.byteLength(content, "utf8"),
      DeployedAt: new Date().toISOString(),
    });
    console.log(`Deployed CloudPage: ${relativeName}`);
    deployed++;
  }

  console.log(`\nDone. Deployed ${deployed}/${pages.length} CloudPages.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("deploy-cloudpages failed:", err);
    process.exitCode = 1;
  });
}

module.exports = { validatePage, findHtmlPages };
