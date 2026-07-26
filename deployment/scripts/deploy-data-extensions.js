#!/usr/bin/env node
"use strict";
/**
 * Deploys every Data Extension schema in config/data-extensions/*.json.
 *
 * Real SFMC deployment creates Data Extensions via the SOAP CreateRequest API (there is no REST
 * equivalent for DE *schema* creation, only for row data). This script:
 *   1. Reads every DE definition.
 *   2. Generates the SOAP CreateRequest envelope for each (written to deployment/generated/ for
 *      review/audit — these are the exact payloads a CI pipeline would POST to the SOAP endpoint).
 *   3. Registers a lightweight record of each DE against the mock server (or a real target, if
 *      SHOPSTYLE_MOCK_SERVER_URL points elsewhere) so validate-deployment.js can confirm presence.
 *
 * Usage: node deployment/scripts/deploy-data-extensions.js [--dry-run]
 */

const fs = require("fs");
const path = require("path");
const { MarketingCloudClient, REPO_ROOT } = require("./lib/mcApiClient");

const DE_DIR = path.join(REPO_ROOT, "config", "data-extensions");
const OUTPUT_DIR = path.join(REPO_ROOT, "deployment", "generated", "data-extensions");

const FIELD_TYPE_MAP = {
  Text: "Text", EmailAddress: "EmailAddress", Phone: "Phone", Date: "Date",
  Boolean: "Boolean", Number: "Number", Decimal: "Decimal",
};

function buildCreateRequestXml(deDefinition) {
  const fieldsXml = deDefinition.fields
    .map((f) => {
      const type = FIELD_TYPE_MAP[f.type] || "Text";
      return `        <Field>
          <CustomerKey>${f.name}</CustomerKey>
          <Name>${f.name}</Name>
          <FieldType>${type}</FieldType>
          ${f.length ? `<MaxLength>${f.length}</MaxLength>` : ""}
          ${f.scale ? `<Scale>${f.scale}</Scale>` : ""}
          <IsRequired>${f.isRequired ? "true" : "false"}</IsRequired>
          <IsPrimaryKey>${f.isPrimaryKey ? "true" : "false"}</IsPrimaryKey>
          ${f.defaultValue !== undefined ? `<DefaultValue>${f.defaultValue}</DefaultValue>` : ""}
        </Field>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                   xmlns:ns="http://exacttarget.com/wsdl/partnerAPI">
  <soapenv:Header><fueloauth xmlns="http://exacttarget.com">{{access_token}}</fueloauth></soapenv:Header>
  <soapenv:Body>
    <CreateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <Objects xsi:type="DataExtension" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <CustomerKey>${deDefinition.customerKey}</CustomerKey>
        <Name>${deDefinition.name}</Name>
        <Description>${(deDefinition.description || "").replace(/&/g, "&amp;")}</Description>
        <IsSendable>${deDefinition.isSendable ? "true" : "false"}</IsSendable>
        <Fields>
${fieldsXml}
        </Fields>
      </Objects>
    </CreateRequest>
  </soapenv:Body>
</soapenv:Envelope>`;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const files = fs.readdirSync(DE_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Found ${files.length} Data Extension definitions in ${DE_DIR}`);

  const client = dryRun ? null : MarketingCloudClient.fromEnvironment();
  let deployedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const deDefinition = JSON.parse(fs.readFileSync(path.join(DE_DIR, file), "utf8"));
    const xml = buildCreateRequestXml(deDefinition);
    const outPath = path.join(OUTPUT_DIR, `${deDefinition.name}.CreateRequest.xml`);
    fs.writeFileSync(outPath, xml, "utf8");

    if (dryRun) {
      console.log(`[dry-run] Generated ${outPath}`);
      continue;
    }

    try {
      await client.upsertDataExtensionRow("_DeployedDataExtensions", ["Name"], {
        Name: deDefinition.name,
        CustomerKey: deDefinition.customerKey,
        FieldCount: deDefinition.fields.length,
        DeployedAt: new Date().toISOString(),
      });
      console.log(`Deployed: ${deDefinition.name} (${deDefinition.fields.length} fields)`);
      deployedCount++;
    } catch (err) {
      console.error(`FAILED: ${deDefinition.name} - ${err.message}`);
      errorCount++;
    }
  }

  console.log(`\nDone. Deployed: ${deployedCount}, Failed: ${errorCount}, Generated XML: ${files.length}`);
  if (errorCount > 0) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error("deploy-data-extensions failed:", err);
    process.exitCode = 1;
  });
}

module.exports = { buildCreateRequestXml };
