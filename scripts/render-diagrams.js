#!/usr/bin/env node
"use strict";
/**
 * Extracts every ```mermaid fenced code block from the repo's Markdown files and writes each to its
 * own .mmd file under architecture/diagrams/, named after the source file + block index. Intended
 * to be piped into @mermaid-js/mermaid-cli for SVG export when a rendered image is needed outside
 * Markdown rendering (see docs/best-practices.md#diagrams).
 *
 * Usage: node scripts/render-diagrams.js
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(REPO_ROOT, "architecture", "diagrams");
const SKIP_DIRS = new Set(["node_modules", ".git", "deployment"]);

function findMarkdownFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMarkdownFiles(fullPath, results);
    } else if (entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractMermaidBlocks(content) {
  const blocks = [];
  const regex = /```mermaid\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

function slugify(relativePath) {
  return relativePath.replace(/[\\/]/g, "-").replace(/\.md$/, "");
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const markdownFiles = findMarkdownFiles(REPO_ROOT);
  let totalBlocks = 0;

  for (const filePath of markdownFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    const blocks = extractMermaidBlocks(content);
    if (blocks.length === 0) continue;

    const relativePath = path.relative(REPO_ROOT, filePath);
    const slug = slugify(relativePath);

    blocks.forEach((block, index) => {
      const suffix = blocks.length > 1 ? `-${index + 1}` : "";
      const outPath = path.join(OUTPUT_DIR, `${slug}${suffix}.mmd`);
      fs.writeFileSync(outPath, block + "\n", "utf8");
      console.log(`Extracted: ${relativePath} -> ${path.relative(REPO_ROOT, outPath)}`);
      totalBlocks++;
    });
  }

  console.log(`\nDone. Extracted ${totalBlocks} Mermaid diagram(s) from ${markdownFiles.length} Markdown files.`);
  console.log("Render to SVG with: npx @mermaid-js/mermaid-cli -i <file>.mmd -o <file>.svg");
}

if (require.main === module) main();

module.exports = { extractMermaidBlocks, findMarkdownFiles };
