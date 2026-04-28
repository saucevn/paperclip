#!/usr/bin/env node
/**
 * check-i18n.mjs — CI-friendly i18n parity validator
 *
 * Checks that all locale namespaces in the source locale (en) have full
 * key coverage in every target locale (vi, …).  Also flags keys where the
 * target value is identical to the source value, which usually means the
 * string was never translated (loanwords/intentional exceptions can be
 * whitelisted below).
 *
 * Usage:
 *   node scripts/check-i18n.mjs                  # uses default paths
 *   node scripts/check-i18n.mjs --source en --target vi --locales ui/public/locales
 *   node scripts/check-i18n.mjs --ci             # exit 1 on any failure
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — missing keys or untranslated strings found (--ci flag required for non-zero)
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, resolve } from "path";
import { parseArgs } from "util";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const { values: args } = parseArgs({
  options: {
    source: { type: "string", default: "en" },
    target: { type: "string", default: "vi" },
    locales: { type: "string", default: "ui/public/locales" },
    ci: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
  allowPositionals: false,
});

if (args.help) {
  console.log(`Usage: node scripts/check-i18n.mjs [--source en] [--target vi]
              [--locales ui/public/locales] [--ci]`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Known loanwords / intentionally kept English strings in the target locale.
// Format: "namespace:dot.separated.key"
// ---------------------------------------------------------------------------
const KNOWN_LOANWORDS = new Set([
  // Technical terms deliberately kept in English
  "navigation:sidebar.items.issues",
  "navigation:mobileNav.issues",
  "navigation:commandPalette.issues",
  "navigation:commandPalette.goToIssues",
  "navigation:breadcrumbs.issues",
  "navigation:commandPalette.agents",
  "navigation:breadcrumbs.agents",
  "navigation:sidebar.items.agents",
  "navigation:mobileNav.agents",
  "navigation:companyMenu.switchCompany",
  "navigation:breadcrumbs.plugins",
  "navigation:breadcrumbs.adapters",
  "navigation:breadcrumbs.live",
  "navigation:breadcrumbs.liveRuns",
  "navigation:breadcrumbs.joinRequests",
  "settings:adapters.title",
  "settings:plugins.title",
  "settings:export.title",
  "settings:import.title",
  "issues:title",           // "Issues" — the one known untranslated key
  "dashboard:openOnboarding",
  "agents:role.ceo",
  "agents:role.cto",
  "agents:role.qa",
  "agents:role.devops",
  "agents:role.manager",
  "agents:role.sdr",
  "common:button.upload",
  "common:button.download",
  // Loanwords — technical terms kept in English per THC-12 audit decision
  "agents:detail.issues",
  "agents:config.systemPrompt",
  "auth:login.email",
  "common:status.backlog",
  "issues:filters.backlog",
  "issues:columns.identifier",
  "issues:status.backlog",
  "navigation:sidebar.account.version",   // Brand name: "Paperclip v{{version}}"
  "navigation:breadcrumbs.heartbeats",
  "projects:tabs.issues",
  "routines:group.assignee",
  "routines:trigger.gitPush",
  "settings:profile.email",
  "settings:profile.namePlaceholder",     // "Board" — product role term
  "settings:instance.heartbeat",
  "settings:company.logo",
  "settings:workspace.driver",
  "settings:workspace.host",
  "settings:workspace.knownHosts",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ROOT = resolve(process.cwd());
const LOCALES_DIR = resolve(ROOT, args.locales);

function loadJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (err) {
    throw new Error(`Failed to parse ${filePath}: ${err.message}`);
  }
}

/**
 * Recursively collect all leaf key paths from an object.
 * Returns Map<dotPath, value>
 */
function flattenKeys(obj, prefix = "") {
  const result = new Map();
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const [subPath, subValue] of flattenKeys(value, path)) {
        result.set(subPath, subValue);
      }
    } else {
      result.set(path, String(value ?? ""));
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const sourceDir = join(LOCALES_DIR, args.source);
const targetDir = join(LOCALES_DIR, args.target);

if (!existsSync(sourceDir)) {
  console.error(`Source locale directory not found: ${sourceDir}`);
  process.exit(1);
}
if (!existsSync(targetDir)) {
  console.error(`Target locale directory not found: ${targetDir}`);
  process.exit(1);
}

const namespaces = readdirSync(sourceDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(".json", ""));

let totalMissing = 0;
let totalUntranslated = 0;
let totalKeys = 0;
const report = [];

for (const ns of namespaces) {
  const sourcePath = join(sourceDir, `${ns}.json`);
  const targetPath = join(targetDir, `${ns}.json`);

  if (!existsSync(targetPath)) {
    report.push({ ns, type: "missing_file", message: `Missing ${args.target}/${ns}.json` });
    totalMissing++;
    continue;
  }

  const sourceKeys = flattenKeys(loadJson(sourcePath));
  const targetKeys = flattenKeys(loadJson(targetPath));

  for (const [keyPath, sourceValue] of sourceKeys) {
    totalKeys++;
    const loanwordId = `${ns}:${keyPath}`;

    if (!targetKeys.has(keyPath)) {
      totalMissing++;
      report.push({ ns, type: "missing_key", key: keyPath, message: `[${ns}] Missing key: ${keyPath}` });
      continue;
    }

    const targetValue = targetKeys.get(keyPath);

    // Skip interpolation-only strings (all content is {{variables}})
    const stripped = sourceValue.replace(/\{\{[^}]+\}\}/g, "").trim();
    if (!stripped) continue;

    // Flag if target value equals source value (untranslated), unless whitelisted
    if (
      targetValue === sourceValue &&
      !KNOWN_LOANWORDS.has(loanwordId) &&
      sourceValue.length > 1 // single chars / punctuation are fine
    ) {
      totalUntranslated++;
      report.push({
        ns,
        type: "untranslated",
        key: keyPath,
        value: sourceValue,
        message: `[${ns}] Possibly untranslated (${args.target} === ${args.source}): ${keyPath} = "${sourceValue}"`,
      });
    }
  }

  // Check for extra keys in target not in source (orphaned translations)
  for (const keyPath of targetKeys.keys()) {
    if (!sourceKeys.has(keyPath)) {
      report.push({ ns, type: "orphan_key", key: keyPath, message: `[${ns}] Orphan key in ${args.target} (not in ${args.source}): ${keyPath}` });
    }
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
const missingKeys = report.filter((r) => r.type === "missing_key" || r.type === "missing_file");
const untranslated = report.filter((r) => r.type === "untranslated");
const orphans = report.filter((r) => r.type === "orphan_key");

console.log(`\n=== i18n Parity Report (${args.source} → ${args.target}) ===`);
console.log(`Namespaces checked : ${namespaces.length}`);
console.log(`Total source keys  : ${totalKeys}`);
console.log(`Missing in ${args.target}    : ${totalMissing}`);
console.log(`Possibly untranslated: ${totalUntranslated}`);
console.log(`Orphan keys in ${args.target} : ${orphans.length}`);

if (missingKeys.length > 0) {
  console.log("\n--- MISSING KEYS ---");
  missingKeys.forEach((r) => console.log("  ✗ " + r.message));
}

if (untranslated.length > 0) {
  console.log("\n--- POSSIBLY UNTRANSLATED ---");
  untranslated.forEach((r) => console.log(`  ⚠  ${r.message}`));
  console.log('\n  To suppress a known loanword, add "namespace:key.path" to KNOWN_LOANWORDS in this script.');
}

if (orphans.length > 0) {
  console.log("\n--- ORPHAN KEYS (target has keys source does not) ---");
  orphans.forEach((r) => console.log("  ~  " + r.message));
}

const hasFailures = totalMissing > 0 || totalUntranslated > 0;

if (!hasFailures) {
  console.log(`\n✓ All ${totalKeys} keys translated. Parity OK.\n`);
} else {
  console.log(`\n✗ Parity check failed: ${totalMissing} missing, ${totalUntranslated} possibly untranslated.\n`);
}

if (args.ci && hasFailures) {
  process.exit(1);
}
