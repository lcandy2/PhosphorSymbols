#!/usr/bin/env node

// Phosphor Icons → SF Symbol converter
//
// Single script that does everything:
//   1. Parse metadata from phosphor-core/src/icons.ts
//   2. Convert SVGs to SF Symbol format via swiftdraw
//   3. Generate .xcassets asset catalog
//   4. Generate PhosphorSymbol+All.swift with doc comments
//
// Usage:
//   node Scripts/convert.mjs [--phosphor-core <path>] [--output <path>] [--symbols <path>]

import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, copyFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";

const ROOT = resolve(import.meta.dirname, "..");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const { values: opts } = parseArgs({
  options: {
    "phosphor-core": { type: "string", default: "phosphor-core" },
    output: { type: "string", default: join(ROOT, "Sources", "PhosphorSymbols") },
    symbols: { type: "string", default: "Symbols" },
  },
  strict: false,
});

const phosphorCore = opts["phosphor-core"];
const outputDir = opts.output;
const symbolsDir = opts.symbols;

// ---------------------------------------------------------------------------
// Metadata parser — extract categories & tags from icons.ts
// ---------------------------------------------------------------------------

function parseMetadata() {
  const iconsPath = join(phosphorCore, "src", "icons.ts");
  if (!existsSync(iconsPath)) {
    console.warn("Warning: icons.ts not found, skipping metadata");
    return new Map();
  }

  const content = readFileSync(iconsPath, "utf-8");

  // Extract IconCategory enum values: FINANCE = "Finance", etc.
  const categoryMap = {};
  const catEnum = content.match(/enum\s+IconCategory\s*\{([^}]+)\}/s);
  if (catEnum) {
    for (const m of catEnum[1].matchAll(/(\w+)\s*=\s*"([^"]+)"/g)) {
      categoryMap[m[1]] = m[2].toLowerCase();
    }
  }

  // Extract each icon entry
  const metadata = new Map();
  for (const block of content.matchAll(
    /\{\s*name:\s*"([^"]+)"[\s\S]*?(?=\n\s*\{|\n\s*\];)/g
  )) {
    const name = block[1];
    const text = block[0];

    const categories = [];
    const catMatch = text.match(/categories:\s*\[([^\]]*)\]/);
    if (catMatch) {
      for (const ref of catMatch[1].matchAll(/IconCategory\.(\w+)/g)) {
        categories.push(categoryMap[ref[1]] ?? ref[1].toLowerCase());
      }
    }

    const tags = [];
    const tagMatch = text.match(/tags:\s*\[([^\]]*)\]/);
    if (tagMatch) {
      for (const t of tagMatch[1].matchAll(/"([^"]+)"/g)) {
        if (!t[1].startsWith("*")) tags.push(t[1]);
      }
    }

    metadata.set(name, { categories, tags });
  }

  console.log(`  Parsed metadata for ${metadata.size} icons`);
  return metadata;
}

// ---------------------------------------------------------------------------
// SVG conversion via swiftdraw
// ---------------------------------------------------------------------------

let swiftdrawBin = "swiftdraw";

function convertSVG(inputSvg, outputSvg, { ultralight, black } = {}) {
  const args = [inputSvg, "--format", "sfsymbol", "--insets", "auto", "--size", "medium", "--output", outputSvg];
  if (ultralight) args.push("--ultralight", ultralight);
  if (black) args.push("--black", black);
  try {
    execFileSync(swiftdrawBin, args, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Asset catalog generation
// ---------------------------------------------------------------------------

function createSymbolset(xcassetsDir, symbolName, svgSource) {
  const setDir = join(xcassetsDir, `${symbolName}.symbolset`);
  mkdirSync(setDir, { recursive: true });
  copyFileSync(svgSource, join(setDir, `${symbolName}.svg`));
  writeFileSync(
    join(setDir, "Contents.json"),
    JSON.stringify(
      {
        info: { author: "xcode", version: 1 },
        symbols: [{ filename: `${symbolName}.svg`, idiom: "universal" }],
      },
      null,
      2
    )
  );
}

// ---------------------------------------------------------------------------
// Swift codegen
// ---------------------------------------------------------------------------

const SWIFT_KEYWORDS = new Set([
  "as", "break", "case", "catch", "class", "continue", "default", "defer",
  "deinit", "do", "else", "enum", "extension", "fallthrough", "false",
  "fileprivate", "for", "func", "guard", "if", "import", "in", "init",
  "inout", "internal", "is", "let", "nil", "open", "operator", "override",
  "private", "precedencegroup", "protocol", "public", "repeat", "rethrows",
  "return", "self", "Self", "static", "struct", "subscript", "super",
  "switch", "throw", "throws", "true", "try", "typealias", "var", "where",
  "while",
]);

function toSwiftName(identifier) {
  return identifier.replace(/[-\.]/g, "_");
}

function escapeIfKeyword(name) {
  return SWIFT_KEYWORDS.has(name) ? `\`${name}\`` : name;
}

function generateSwiftProperty(identifier, swiftName, meta) {
  const lines = [];

  lines.push(`\t/// \`${identifier}\``);

  if (meta?.categories?.length) {
    lines.push(`\t///`);
    lines.push(`\t/// - categories:`);
    for (const cat of meta.categories) {
      lines.push(`\t///   - \`${cat}\``);
    }
  }

  if (meta?.tags?.length) {
    lines.push(`\t///`);
    lines.push(`\t/// - search keywords:`);
    for (const tag of meta.tags) {
      lines.push(`\t///   - \`${tag}\``);
    }
  }

  lines.push(
    `\tstatic public let ${escapeIfKeyword(swiftName)} = PhosphorSymbol(identifier: "${identifier}")`
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const assetsDir = join(phosphorCore, "assets");
const xcassetsDir = join(outputDir, "Resources", "PhosphorSymbols.xcassets");
const swiftOutPath = join(outputDir, "PhosphorSymbol+All.swift");

if (!existsSync(assetsDir)) {
  console.error(`Error: Phosphor assets not found at ${assetsDir}`);
  console.error(`Run: git clone https://github.com/phosphor-icons/core.git ${phosphorCore}`);
  process.exit(1);
}

// Resolve swiftdraw full path (execFileSync doesn't go through shell)
try {
  swiftdrawBin = execSync("which swiftdraw", { encoding: "utf-8" }).trim();
} catch {
  console.error("Error: swiftdraw not found. Install with: brew install swiftdraw");
  process.exit(1);
}

// Step 1: Parse metadata
console.log("Parsing metadata...");
const metadata = parseMetadata();

// Step 2: Prepare output directories
rmSync(symbolsDir, { recursive: true, force: true });
rmSync(xcassetsDir, { recursive: true, force: true });
for (const sub of ["outline", "fill", "duotone"]) {
  mkdirSync(join(symbolsDir, sub), { recursive: true });
}
mkdirSync(xcassetsDir, { recursive: true });

writeFileSync(
  join(xcassetsDir, "Contents.json"),
  JSON.stringify({ info: { author: "xcode", version: 1 } }, null, 2)
);

let total = 0;
let failed = 0;
const outlineNames = [];
const fillNames = [];
const duotoneNames = [];

// Step 3: Convert outline variants (regular + thin/bold variable weight)
console.log("Converting outline variants...");
const regularDir = join(assetsDir, "regular");
for (const file of readdirSync(regularDir).filter((f) => f.endsWith(".svg"))) {
  const name = basename(file, ".svg");
  const outFile = join(symbolsDir, "outline", `${name}.svg`);

  const convertOpts = {};
  const thinSvg = join(assetsDir, "thin", file);
  const boldSvg = join(assetsDir, "bold", file);
  if (existsSync(thinSvg)) convertOpts.ultralight = thinSvg;
  if (existsSync(boldSvg)) convertOpts.black = boldSvg;

  if (convertSVG(join(regularDir, file), outFile, convertOpts)) {
    createSymbolset(xcassetsDir, name, outFile);
    outlineNames.push(name);
    total++;
  } else {
    console.log(`  Failed: ${name}`);
    failed++;
  }
}

// Step 4: Convert fill variants
console.log("Converting fill variants...");
const fillDir = join(assetsDir, "fill");
for (const file of readdirSync(fillDir).filter((f) => f.endsWith(".svg"))) {
  const rawName = basename(file, ".svg");
  const cleanName = rawName.replace(/-fill$/, ".fill");
  const outFile = join(symbolsDir, "fill", `${cleanName}.svg`);

  if (convertSVG(join(fillDir, file), outFile)) {
    createSymbolset(xcassetsDir, cleanName, outFile);
    fillNames.push(cleanName);
    total++;
  } else {
    console.log(`  Failed: ${cleanName}`);
    failed++;
  }
}

// Step 5: Convert duotone variants
console.log("Converting duotone variants...");
const duotoneDir = join(assetsDir, "duotone");
if (existsSync(duotoneDir)) {
  for (const file of readdirSync(duotoneDir).filter((f) => f.endsWith(".svg"))) {
    const rawName = basename(file, ".svg");
    const cleanName = rawName.replace(/-duotone$/, ".duotone");
    const outFile = join(symbolsDir, "duotone", `${cleanName}.svg`);

    if (convertSVG(join(duotoneDir, file), outFile)) {
      createSymbolset(xcassetsDir, cleanName, outFile);
      duotoneNames.push(cleanName);
      total++;
    } else {
      console.log(`  Failed: ${cleanName}`);
      failed++;
    }
  }
}

// Step 6: Generate Swift source
console.log("Generating Swift source...");

const properties = [];

for (const name of outlineNames) {
  properties.push(generateSwiftProperty(name, toSwiftName(name), metadata.get(name)));
}

for (const name of fillNames) {
  const baseName = name.replace(/\.fill$/, "");
  properties.push(generateSwiftProperty(name, toSwiftName(name), metadata.get(baseName)));
}

for (const name of duotoneNames) {
  const baseName = name.replace(/\.duotone$/, "");
  properties.push(generateSwiftProperty(name, toSwiftName(name), metadata.get(baseName)));
}

const swift = `//
//  PhosphorSymbol+All.swift
//
//  Automatically generated by PhosphorSymbols.
//  Do not edit directly!
//  swift-format-ignore-file

import Foundation

extension PhosphorSymbol {
${properties.join("\n\n")}
}
`;

writeFileSync(swiftOutPath, swift);

console.log();
console.log(`Done! Converted ${total} symbols (${failed} failed)`);
console.log(`  Outline:  ${outlineNames.length}`);
console.log(`  Fill:     ${fillNames.length}`);
console.log(`  Duotone:  ${duotoneNames.length}`);
console.log(`  Output:   ${symbolsDir}/`);
