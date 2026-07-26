#!/usr/bin/env node
/**
 * Parses DMARC aggregate (RUA) report XML files delivered to dmarc-reports@shopstyleretail.com
 * (see architecture/sender-authentication.md) and summarizes pass/fail alignment by source IP,
 * flagging any sending source NOT recognized as a ShopStyle-owned Marketing Cloud IP pool —
 * a strong signal of spoofing/abuse of the domain.
 *
 * Aggregate reports arrive gzipped XML; this script expects them already decompressed into
 * deliverability/dmarc-reports/inbound/*.xml (decompression handled by the mailbox ingestion
 * pipeline, out of scope for this script).
 *
 * Usage: node deliverability/monitors/parse-dmarc-aggregate.js <path-to-report.xml>
 */
"use strict";

const fs = require("fs");

const KNOWN_IP_POOLS = [
  // Populated from architecture/sender-authentication.md IP pool assignments.
  { range: "136.147.", pool: "ip-pool-us-primary" },
  { range: "168.245.", pool: "ip-pool-ca-primary" },
];

function extractRecords(xml) {
  const records = [];
  const recordBlocks = xml.match(/<record>[\s\S]*?<\/record>/g) || [];
  for (const block of recordBlocks) {
    const sourceIp = (block.match(/<source_ip>(.*?)<\/source_ip>/) || [])[1];
    const count = parseInt((block.match(/<count>(\d+)<\/count>/) || [])[1] || "0", 10);
    const dkimResult = (block.match(/<dkim>(.*?)<\/dkim>/) || [])[1];
    const spfResult = (block.match(/<spf>(.*?)<\/spf>/) || [])[1];
    const disposition = (block.match(/<disposition>(.*?)<\/disposition>/) || [])[1];
    records.push({ sourceIp, count, dkimResult, spfResult, disposition });
  }
  return records;
}

function classifySource(ip) {
  const known = KNOWN_IP_POOLS.find((p) => ip && ip.startsWith(p.range));
  return known ? known.pool : "UNKNOWN — investigate";
}

function summarize(records) {
  const summary = {};
  for (const r of records) {
    const pool = classifySource(r.sourceIp);
    if (!summary[pool]) summary[pool] = { totalMessages: 0, dkimPass: 0, spfPass: 0, quarantined: 0, rejected: 0 };
    summary[pool].totalMessages += r.count;
    if (r.dkimResult === "pass") summary[pool].dkimPass += r.count;
    if (r.spfResult === "pass") summary[pool].spfPass += r.count;
    if (r.disposition === "quarantine") summary[pool].quarantined += r.count;
    if (r.disposition === "reject") summary[pool].rejected += r.count;
  }
  return summary;
}

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node parse-dmarc-aggregate.js <path-to-report.xml>");
    process.exitCode = 1;
    return;
  }

  const xml = fs.readFileSync(filePath, "utf8");
  const records = extractRecords(xml);
  const summary = summarize(records);

  console.log(`DMARC Aggregate Report Summary: ${filePath}\n`);
  for (const [pool, stats] of Object.entries(summary)) {
    console.log(`Source: ${pool}`);
    console.log(`  Messages: ${stats.totalMessages}`);
    console.log(`  DKIM pass rate: ${((stats.dkimPass / stats.totalMessages) * 100).toFixed(1)}%`);
    console.log(`  SPF pass rate:  ${((stats.spfPass / stats.totalMessages) * 100).toFixed(1)}%`);
    if (pool === "UNKNOWN — investigate" && stats.totalMessages > 0) {
      console.log(`  *** ALERT: ${stats.totalMessages} messages from an unrecognized source claiming our domain — possible spoofing. ***`);
    }
    if (stats.quarantined > 0 || stats.rejected > 0) {
      console.log(`  Quarantined: ${stats.quarantined}, Rejected: ${stats.rejected}`);
    }
    console.log("");
  }
}

if (require.main === module) main();

module.exports = { extractRecords, classifySource, summarize };
