#!/usr/bin/env node
/**
 * Codemod: Migrate hardcoded Tailwind slate/gray color classes to design tokens.
 *
 * Usage:
 *   node e2e/codemod-colors.mjs [--dry-run] [--batch components|features|app|rest]
 *
 * Mapping: slate/gray shades → shadcn/ui semantic tokens (already defined in globals.css)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const DRY_RUN = process.argv.includes('--dry-run')
const BATCH = process.argv.find((a, i) => process.argv[i - 1] === '--batch') || 'all'

// ─── Direct class replacements ───────────────────────────────────────
// Order matters: more specific patterns first
const REPLACEMENTS = [
  // ── Text colors ──
  // Dark text → foreground token
  ['text-slate-950', 'text-foreground'],
  ['text-slate-900', 'text-foreground'],
  ['text-slate-800', 'text-foreground'],
  ['text-gray-950', 'text-foreground'],
  ['text-gray-900', 'text-foreground'],
  ['text-gray-800', 'text-foreground'],

  // Medium text → secondary
  ['text-slate-700', 'text-secondary-foreground'],
  ['text-slate-600', 'text-secondary-foreground'],
  ['text-gray-700', 'text-secondary-foreground'],
  ['text-gray-600', 'text-secondary-foreground'],

  // Muted text → muted-foreground
  ['text-slate-500', 'text-muted-foreground'],
  ['text-slate-400', 'text-muted-foreground'],
  ['text-gray-500', 'text-muted-foreground'],
  ['text-gray-400', 'text-muted-foreground'],

  // Subtle text
  ['text-slate-300', 'text-muted-foreground'],
  ['text-slate-200', 'text-muted-foreground'],
  ['text-slate-100', 'text-muted-foreground'],
  ['text-gray-300', 'text-muted-foreground'],
  ['text-gray-200', 'text-muted-foreground'],
  ['text-gray-100', 'text-muted-foreground'],

  // ── Background colors ──
  ['bg-slate-50', 'bg-background'],
  ['bg-slate-100', 'bg-muted'],
  ['bg-slate-200', 'bg-accent'],
  ['bg-slate-300', 'bg-accent'],
  ['bg-gray-50', 'bg-background'],
  ['bg-gray-100', 'bg-muted'],
  ['bg-gray-200', 'bg-accent'],
  ['bg-gray-300', 'bg-accent'],

  // Mid-range backgrounds
  ['bg-slate-400', 'bg-accent'],
  ['bg-slate-500', 'bg-accent'],
  ['bg-slate-600', 'bg-accent'],
  ['bg-gray-400', 'bg-accent'],
  ['bg-gray-500', 'bg-accent'],
  ['bg-gray-600', 'bg-accent'],

  // Dark backgrounds (used in dark: context or standalone dark sections)
  ['bg-slate-700', 'bg-accent'],
  ['bg-slate-800', 'bg-card'],
  ['bg-slate-900', 'bg-card'],
  ['bg-slate-950', 'bg-background'],
  ['bg-gray-700', 'bg-accent'],
  ['bg-gray-800', 'bg-card'],
  ['bg-gray-900', 'bg-card'],
  ['bg-gray-950', 'bg-background'],

  // ── Border colors ──
  ['border-slate-100', 'border-border'],
  ['border-slate-200', 'border-border'],
  ['border-slate-300', 'border-border'],
  ['border-slate-400', 'border-border'],
  ['border-slate-500', 'border-border'],
  ['border-slate-600', 'border-border'],
  ['border-slate-700', 'border-border'],
  ['border-slate-800', 'border-border'],
  ['border-gray-100', 'border-border'],
  ['border-gray-200', 'border-border'],
  ['border-gray-300', 'border-border'],
  ['border-gray-400', 'border-border'],
  ['border-gray-500', 'border-border'],
  ['border-gray-600', 'border-border'],
  ['border-gray-700', 'border-border'],
  ['border-gray-800', 'border-border'],

  // ── Ring colors ──
  ['ring-slate-100', 'ring-ring'],
  ['ring-slate-200', 'ring-ring'],
  ['ring-slate-300', 'ring-ring'],
  ['ring-slate-400', 'ring-ring'],
  ['ring-slate-500', 'ring-ring'],
  ['ring-slate-700', 'ring-ring'],
  ['ring-gray-100', 'ring-ring'],
  ['ring-gray-200', 'ring-ring'],
  ['ring-gray-300', 'ring-ring'],
  ['ring-gray-400', 'ring-ring'],
  ['ring-gray-500', 'ring-ring'],

  // ── Divide colors ──
  ['divide-slate-100', 'divide-border'],
  ['divide-slate-200', 'divide-border'],
  ['divide-slate-300', 'divide-border'],
  ['divide-slate-700', 'divide-border'],
  ['divide-gray-100', 'divide-border'],
  ['divide-gray-200', 'divide-border'],
  ['divide-gray-300', 'divide-border'],
  ['divide-gray-700', 'divide-border'],

  // ── Placeholder colors ──
  ['placeholder-slate-300', 'placeholder-muted-foreground'],
  ['placeholder-slate-400', 'placeholder-muted-foreground'],
  ['placeholder-slate-500', 'placeholder-muted-foreground'],
  ['placeholder-gray-300', 'placeholder-muted-foreground'],
  ['placeholder-gray-400', 'placeholder-muted-foreground'],
  ['placeholder-gray-500', 'placeholder-muted-foreground'],

  // ── Shadow colors ──
  ['shadow-slate-100', 'shadow-border'],
  ['shadow-slate-200', 'shadow-border'],
  ['shadow-slate-500', 'shadow-border'],
  ['shadow-gray-100', 'shadow-border'],
  ['shadow-gray-200', 'shadow-border'],

  // ── Gradient colors ──
  ['from-slate-50', 'from-background'],
  ['from-slate-100', 'from-muted'],
  ['from-slate-800', 'from-card'],
  ['from-slate-900', 'from-card'],
  ['to-slate-50', 'to-background'],
  ['to-slate-100', 'to-muted'],
  ['to-slate-800', 'to-card'],
  ['to-slate-900', 'to-card'],
  ['via-slate-100', 'via-muted'],
  ['from-gray-50', 'from-background'],
  ['from-gray-100', 'from-muted'],
  ['to-gray-50', 'to-background'],
  ['to-gray-100', 'to-muted'],

  // ── Fill/Stroke ──
  ['fill-slate-400', 'fill-muted-foreground'],
  ['fill-slate-500', 'fill-muted-foreground'],
  ['stroke-slate-200', 'stroke-border'],
  ['stroke-slate-300', 'stroke-border'],
  ['fill-gray-400', 'fill-muted-foreground'],
  ['fill-gray-500', 'fill-muted-foreground'],
  ['stroke-gray-200', 'stroke-border'],
  ['stroke-gray-300', 'stroke-border'],
]

// Dark-mode classes to remove after token migration (tokens auto-adapt)
const DARK_REMOVALS = [
  // dark:text-white is redundant when text-foreground is used (foreground = near-white in dark)
  /\bdark:text-white\b/g,
  // dark:text-slate-* / dark:text-gray-* are redundant with tokens
  /\bdark:text-slate-\d{2,3}(?:\/\d+)?\b/g,
  /\bdark:text-gray-\d{2,3}(?:\/\d+)?\b/g,
  // dark:bg-slate-* / dark:bg-gray-*
  /\bdark:bg-slate-\d{2,3}(?:\/\d+)?\b/g,
  /\bdark:bg-gray-\d{2,3}(?:\/\d+)?\b/g,
  // dark:border-slate-* / dark:border-gray-*
  /\bdark:border-slate-\d{2,3}(?:\/\d+)?\b/g,
  /\bdark:border-gray-\d{2,3}(?:\/\d+)?\b/g,
  // dark:ring-slate-*
  /\bdark:ring-slate-\d{2,3}(?:\/\d+)?\b/g,
  /\bdark:ring-gray-\d{2,3}(?:\/\d+)?\b/g,
  // dark:divide-slate-*
  /\bdark:divide-slate-\d{2,3}(?:\/\d+)?\b/g,
  /\bdark:divide-gray-\d{2,3}(?:\/\d+)?\b/g,
  // dark:placeholder-slate-*
  /\bdark:placeholder-slate-\d{2,3}(?:\/\d+)?\b/g,
  /\bdark:placeholder-gray-\d{2,3}(?:\/\d+)?\b/g,
  // dark:shadow-slate-*
  /\bdark:shadow-slate-\d{2,3}(?:\/\d+)?\b/g,
  // dark:from/to/via-slate-*
  /\bdark:(?:from|to|via)-slate-\d{2,3}(?:\/\d+)?\b/g,
  /\bdark:(?:from|to|via)-gray-\d{2,3}(?:\/\d+)?\b/g,
  // dark:fill/stroke-slate-*
  /\bdark:(?:fill|stroke)-slate-\d{2,3}(?:\/\d+)?\b/g,
  // Also remove dark:border-white/N patterns often paired with dark borders
  /\bdark:border-white\/\d+\b/g,
]

// ─── Find target files ───────────────────────────────────────────────
function getFiles() {
  const batchPaths = {
    components: 'components/',
    features: 'features/',
    app: 'app/',
    rest: '', // we filter below
    all: '',
  }

  const searchPath = batchPaths[BATCH] || ''
  const cmd = `find ${searchPath || '.'} -type f \\( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" \\) ! -path "*/node_modules/*" ! -path "*/.next/*" ! -path "*/e2e/*" ! -path "*/test/*"`
  const stdout = execSync(cmd, { encoding: 'utf-8', cwd: process.cwd() })
  let files = stdout.trim().split('\n').filter(Boolean)

  if (BATCH === 'rest') {
    files = files.filter(f => !f.startsWith('./components/') && !f.startsWith('./features/') && !f.startsWith('./app/'))
  }

  return files
}

// ─── Apply replacements to a single file ─────────────────────────────
function migrateFile(filepath) {
  let content = readFileSync(filepath, 'utf-8')
  const original = content
  let changes = 0

  // Pass 1: Direct class replacements (with optional prefix support)
  for (const [from, to] of REPLACEMENTS) {
    // Match: standalone, or with prefix like hover:, focus:, group-hover:, etc.
    // Also handle opacity modifiers like /50
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b((?:hover:|focus:|active:|disabled:|group-hover:|peer-hover:|focus-within:|focus-visible:|sm:|md:|lg:|xl:|2xl:)*)${escaped}((?:\\/\\d+)?)\\b`, 'g')

    const toEscaped = to
    content = content.replace(regex, (match, prefix, opacity) => {
      changes++
      return `${prefix}${toEscaped}${opacity}`
    })
  }

  // Pass 2: Remove redundant dark: variants
  for (const pattern of DARK_REMOVALS) {
    const before = content
    content = content.replace(pattern, '')
    if (content !== before) changes++
  }

  // Pass 3: Clean up multiple spaces ONLY inside className/class strings
  // Never touch indentation — only collapse spaces within quoted class attributes
  content = content.replace(
    /(className\s*=\s*["'`{])([^"'`]*?)(["'`}])/g,
    (match, open, classes, close) => {
      const cleaned = classes.replace(/  +/g, ' ').trim()
      return `${open}${cleaned}${close}`
    }
  )
  // Also handle cn(...) and clsx(...) template literals
  content = content.replace(
    /(cn|clsx|twMerge)\(([^)]*)\)/g,
    (match, fn, args) => {
      const cleaned = args.replace(/  +/g, ' ')
      return `${fn}(${cleaned})`
    }
  )

  if (content !== original) {
    if (!DRY_RUN) {
      writeFileSync(filepath, content, 'utf-8')
    }
    return { filepath, changes }
  }
  return null
}

// ─── Main ────────────────────────────────────────────────────────────
const files = getFiles()
console.log(`\n🎨 Color Migration Codemod`)
console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
console.log(`   Batch: ${BATCH}`)
console.log(`   Files to scan: ${files.length}\n`)

let totalChanges = 0
let totalFiles = 0

for (const file of files) {
  const result = migrateFile(file)
  if (result) {
    totalFiles++
    totalChanges += result.changes
    console.log(`  ✓ ${result.filepath} (${result.changes} changes)`)
  }
}

console.log(`\n📊 Summary:`)
console.log(`   Files modified: ${totalFiles}`)
console.log(`   Total changes: ${totalChanges}`)
console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no files written)' : 'LIVE (files updated)'}\n`)
