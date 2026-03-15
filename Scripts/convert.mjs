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
import { basename, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    phosphorCore: "phosphor-core",
    output: join(ROOT, "Sources", "PhosphorSymbols"),
    symbols: "Symbols",
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--phosphor-core" && args[i + 1]) opts.phosphorCore = args[++i];
    else if (args[i] === "--output" && args[i + 1]) opts.output = args[++i];
    else if (args[i] === "--symbols" && args[i + 1]) opts.symbols = args[++i];
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Metadata parser — extract categories & tags from icons.ts
// ---------------------------------------------------------------------------

function parseMetadata(phosphorCore) {
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
  // Match icon objects: { name: "xxx", ... }
  const iconBlocks = content.matchAll(
    /\{\s*name:\s*"([^"]+)"[\s\S]*?(?=\n\s*\{|\n\s*\];)/g
  );

  for (const block of iconBlocks) {
    const name = block[1];
    const text = block[0];

    // Categories
    const categories = [];
    const catMatch = text.match(/categories:\s*\[([^\]]*)\]/);
    if (catMatch) {
      for (const ref of catMatch[1].matchAll(/IconCategory\.(\w+)/g)) {
        categories.push(categoryMap[ref[1]] || ref[1].toLowerCase());
      }
    }

    // Tags (skip internal markers like *new*, *updated*)
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

function convertSVG(inputSvg, outputSvg, { ultralight, black } = {}) {
  const args = [inputSvg, "--format", "sfsymbol", "--insets", "auto", "--output", outputSvg];
  if (ultralight) args.push("--ultralight", ultralight);
  if (black) args.push("--black", black);
  try {
    execFileSync("swiftdraw", args, { stdio: "pipe" });
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

  // Doc comment: identifier
  lines.push(`\t/// \`${identifier}\``);

  // Categories
  if (meta?.categories?.length) {
    lines.push(`\t///`);
    lines.push(`\t/// - categories:`);
    for (const cat of meta.categories) {
      lines.push(`\t///   - \`${cat}\``);
    }
  }

  // Tags / search keywords
  if (meta?.tags?.length) {
    lines.push(`\t///`);
    lines.push(`\t/// - search keywords:`);
    for (const tag of meta.tags) {
      lines.push(`\t///   - \`${tag}\``);
    }
  }

  // Property declaration
  lines.push(
    `\tstatic public let ${escapeIfKeyword(swiftName)} = PhosphorSymbol(identifier: "${identifier}")`
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const opts = parseArgs();
  const assetsDir = join(opts.phosphorCore, "assets");
  const xcassetsDir = join(opts.output, "Resources", "PhosphorSymbols.xcassets");
  const swiftOutPath = join(opts.output, "PhosphorSymbol+All.swift");

  if (!existsSync(assetsDir)) {
    console.error(`Error: Phosphor assets not found at ${assetsDir}`);
    console.error(`Run: git clone https://github.com/phosphor-icons/core.git ${opts.phosphorCore}`);
    process.exit(1);
  }

  // Resolve swiftdraw path (execFileSync doesn't go through shell, so PATH may not include Homebrew)
  let swiftdrawPath;
  try {
    swiftdrawPath = execSync("which swiftdraw", { encoding: "utf-8" }).trim();
  } catch {
    console.error("Error: swiftdraw not found. Install with: brew install swiftdraw");
    process.exit(1);
  }

  // Step 1: Parse metadata
  console.log("Parsing metadata...");
  const metadata = parseMetadata(opts.phosphorCore);

  // Step 2: Prepare output directories
  rmSync(opts.symbols, { recursive: true, force: true });
  rmSync(xcassetsDir, { recursive: true, force: true });
  mkdirSync(join(opts.symbols, "outline"), { recursive: true });
  mkdirSync(join(opts.symbols, "fill"), { recursive: true });
  mkdirSync(xcassetsDir, { recursive: true });

  writeFileSync(
    join(xcassetsDir, "Contents.json"),
    JSON.stringify({ info: { author: "xcode", version: 1 } }, null, 2)
  );

  let total = 0;
  let failed = 0;
  const outlineNames = [];
  const fillNames = [];

  // Step 3: Convert outline variants
  console.log("Converting outline variants...");
  const regularDir = join(assetsDir, "regular");
  for (const file of readdirSync(regularDir).filter((f) => f.endsWith(".svg"))) {
    const name = basename(file, ".svg");
    const outFile = join(opts.symbols, "outline", `${name}.svg`);

    const thinSvg = join(assetsDir, "thin", file);
    const boldSvg = join(assetsDir, "bold", file);

    const convertOpts = {};
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
    const outFile = join(opts.symbols, "fill", `${cleanName}.svg`);

    if (convertSVG(join(fillDir, file), outFile)) {
      createSymbolset(xcassetsDir, cleanName, outFile);
      fillNames.push(cleanName);
      total++;
    } else {
      console.log(`  Failed: ${cleanName}`);
      failed++;
    }
  }

  // Step 5: Generate Swift source
  console.log("Generating Swift source...");

  const properties = [];

  for (const name of outlineNames) {
    const swiftName = toSwiftName(name);
    const meta = metadata.get(name);
    properties.push(generateSwiftProperty(name, swiftName, meta));
  }

  for (const name of fillNames) {
    const baseName = name.replace(/\.fill$/, "");
    const swiftName = toSwiftName(name);
    const meta = metadata.get(baseName);
    properties.push(generateSwiftProperty(name, swiftName, meta));
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
  console.log(`  Raw SVGs:      ${opts.symbols}/`);
  console.log(`  Asset catalog: ${xcassetsDir}`);
  console.log(`  Swift source:  ${swiftOutPath}`);
}

main();
