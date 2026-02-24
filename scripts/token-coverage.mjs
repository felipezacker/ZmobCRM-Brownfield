#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

// --- Config ---
const SCAN_DIRS = ['app', 'components', 'features'];
const EXTENSIONS = new Set(['.tsx', '.ts']);
const EXCLUDE_DIRS = new Set(['node_modules', '.next', '.claude', 'dist', 'build']);

const HARDCODED_COLOR_RE = /(?:text|bg|border|ring|shadow|from|to|via|outline|accent|fill|stroke|divide|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)-\d+/g;

const SEMANTIC_CLASS_RE = /(?:text|bg|border|ring)-(?:primary|secondary|surface|foreground|muted|accent|destructive|popover|card|input|background)(?:-[\w]+)*/g;

const HEX_COLOR_RE = /#[0-9a-fA-F]{6}\b/g;

const ARBITRARY_COLOR_RE = /(?:text|bg|border|ring|shadow|from|to|via|outline|accent|fill|stroke|divide|placeholder)-\[#[0-9A-Fa-f]+\]/g;

const INLINE_COLOR_FN_RE = /(?:rgba?|hsla?)\(\s*[\d.,\s%]+\)/g;

const CSS_VAR_COLOR_RE = /var\(--color-[\w-]+\)/g;

// --- CLI args ---
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const thresholdIdx = args.indexOf('--threshold');
const threshold = thresholdIdx !== -1 ? Number(args[thresholdIdx + 1]) : 0;

// --- File walker ---
function walkDir(dir) {
  const files = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      files.push(...walkDir(full));
    } else if (EXTENSIONS.has(extname(entry))) {
      files.push(full);
    }
  }
  return files;
}

// --- Scan ---
const root = process.cwd();
const allFiles = SCAN_DIRS.flatMap(d => walkDir(join(root, d)));

const results = { hardcoded: [], semantic: [], hex: [], cssVar: [] };
const perFile = {};

for (const file of allFiles) {
  const content = readFileSync(file, 'utf-8');
  const rel = relative(root, file);

  const hardcoded = content.match(HARDCODED_COLOR_RE) || [];
  const semantic = content.match(SEMANTIC_CLASS_RE) || [];
  const hex = content.match(HEX_COLOR_RE) || [];
  const cssVar = content.match(CSS_VAR_COLOR_RE) || [];
  const arbitrary = content.match(ARBITRARY_COLOR_RE) || [];
  const inlineFn = content.match(INLINE_COLOR_FN_RE) || [];

  if (hardcoded.length || semantic.length || hex.length || cssVar.length || arbitrary.length || inlineFn.length) {
    perFile[rel] = {
      hardcoded: hardcoded.length + arbitrary.length + inlineFn.length,
      semantic: semantic.length,
      hex: hex.length,
      cssVar: cssVar.length,
    };
  }

  results.hardcoded.push(...hardcoded, ...arbitrary, ...inlineFn);
  results.semantic.push(...semantic);
  results.hex.push(...hex);
  results.cssVar.push(...cssVar);
}

// --- Calculate ---
const totalHardcoded = results.hardcoded.length + results.hex.length;
const totalSemantic = results.semantic.length + results.cssVar.length;
const totalAll = totalHardcoded + totalSemantic;
const coverage = totalAll === 0 ? 100 : ((totalSemantic / totalAll) * 100);

// --- Output ---
if (jsonMode) {
  const output = {
    summary: {
      filesScanned: allFiles.length,
      totalColorReferences: totalAll,
      hardcodedColors: results.hardcoded.length,
      hexColors: results.hex.length,
      totalHardcoded: totalHardcoded,
      semanticClasses: results.semantic.length,
      cssVariables: results.cssVar.length,
      totalSemantic: totalSemantic,
      coveragePercent: Math.round(coverage * 100) / 100,
      threshold,
      pass: coverage >= threshold,
    },
    perFile,
  };
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log(`\n# Token Coverage Report\n`);
  console.log(`| Metric | Count |`);
  console.log(`|---|---|`);
  console.log(`| Files scanned | ${allFiles.length} |`);
  console.log(`| Hardcoded Tailwind colors | ${results.hardcoded.length} |`);
  console.log(`| Hardcoded hex colors | ${results.hex.length} |`);
  console.log(`| **Total hardcoded** | **${totalHardcoded}** |`);
  console.log(`| Semantic token classes | ${results.semantic.length} |`);
  console.log(`| CSS variable references | ${results.cssVar.length} |`);
  console.log(`| **Total semantic** | **${totalSemantic}** |`);
  console.log(`| **Total color references** | **${totalAll}** |`);
  console.log(`| **Semantic coverage** | **${coverage.toFixed(1)}%** |`);
  console.log(`| Threshold | ${threshold}% |`);
  console.log(`| Status | ${coverage >= threshold ? 'PASS' : 'FAIL'} |`);

  // Top offenders
  const sorted = Object.entries(perFile)
    .map(([f, v]) => [f, v.hardcoded + v.hex])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  if (sorted.length) {
    console.log(`\n## Top Hardcoded Offenders\n`);
    console.log(`| File | Hardcoded | Semantic |`);
    console.log(`|---|---|---|`);
    for (const [f] of sorted) {
      const d = perFile[f];
      console.log(`| ${f} | ${d.hardcoded + d.hex} | ${d.semantic + d.cssVar} |`);
    }
  }
}

// --- Exit code ---
if (coverage < threshold) {
  console.error(`\nFAIL: Coverage ${coverage.toFixed(1)}% is below threshold ${threshold}%`);
  process.exit(1);
}
