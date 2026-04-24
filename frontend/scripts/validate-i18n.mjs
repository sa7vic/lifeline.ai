import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const localeRoot = path.join(root, "src", "i18n", "locales");
const srcRoot = path.join(root, "src");

function flatten(obj, prefix = "", out = {}) {
  Object.entries(obj || {}).forEach(([key, value]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flatten(value, next, out);
    } else {
      out[next] = value;
    }
  });
  return out;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function collectSourceFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function collectUsedKeys(files) {
  const used = new Set();
  const tRegex = /\bt\(\s*["'`]([^"'`$]+)["'`]/g;
  const i18nKeyRegex = /i18nKey\s*=\s*["']([^"']+)["']/g;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");

    let match;
    while ((match = tRegex.exec(content)) !== null) {
      used.add(match[1]);
    }
    while ((match = i18nKeyRegex.exec(content)) !== null) {
      used.add(match[1]);
    }
  }

  return used;
}

function withPluralAndContextVariants(keys) {
  const variants = new Set(keys);
  for (const key of keys) {
    variants.add(`${key}_zero`);
    variants.add(`${key}_one`);
    variants.add(`${key}_two`);
    variants.add(`${key}_few`);
    variants.add(`${key}_many`);
    variants.add(`${key}_other`);
    variants.add(`${key}_male`);
    variants.add(`${key}_female`);
  }
  return variants;
}

const localeDirs = fs
  .readdirSync(localeRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const baseLocale = "en";
if (!localeDirs.includes(baseLocale)) {
  console.error("Missing base locale: en");
  process.exit(1);
}

const basePath = path.join(localeRoot, baseLocale, "translation.json");
const baseKeys = Object.keys(flatten(readJson(basePath))).sort();

let hasMissing = false;

for (const locale of localeDirs) {
  if (locale === baseLocale) continue;

  const localePath = path.join(localeRoot, locale, "translation.json");
  const localeKeys = Object.keys(flatten(readJson(localePath))).sort();
  const localeSet = new Set(localeKeys);
  const baseSet = new Set(baseKeys);

  const missing = baseKeys.filter((key) => !localeSet.has(key));
  const extra = localeKeys.filter((key) => !baseSet.has(key));

  if (missing.length) {
    hasMissing = true;
    console.error(`\n[${locale}] Missing keys (${missing.length}):`);
    missing.forEach((key) => console.error(`  - ${key}`));
  }

  if (extra.length) {
    console.warn(`\n[${locale}] Extra keys (${extra.length}):`);
    extra.forEach((key) => console.warn(`  - ${key}`));
  }
}

const sourceFiles = collectSourceFiles(srcRoot);
const usedKeys = collectUsedKeys(sourceFiles);
const usedWithVariants = withPluralAndContextVariants(usedKeys);
const unused = baseKeys.filter((key) => !usedWithVariants.has(key));

console.log(`Checked locales: ${localeDirs.join(", ")}`);
console.log(`Base key count: ${baseKeys.length}`);
console.log(`Statically referenced keys: ${usedKeys.size}`);

if (unused.length) {
  console.warn(`\nPotentially unused keys (${unused.length}) (dynamic keys may appear here):`);
  unused.slice(0, 50).forEach((key) => console.warn(`  - ${key}`));
  if (unused.length > 50) {
    console.warn(`  ... and ${unused.length - 50} more`);
  }
}

if (hasMissing) {
  console.error("\ni18n validation failed due to missing keys.");
  process.exit(1);
}

console.log("\ni18n validation passed.");
